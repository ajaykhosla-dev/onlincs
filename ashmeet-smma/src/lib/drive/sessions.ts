import 'server-only'
import { randomUUID } from 'node:crypto'
import { decrypt, encrypt } from '@/lib/crypto'
import { canAccess } from '@/lib/auth/can-access'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { drive, serviceAccountToken } from '@/lib/drive/auth'
import { env } from '@/lib/env'
import type { User } from '@/types/database'

const INIT_URL =
  'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,name,size,mimeType,webViewLink,parents'
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

export type UploadError =
  | { code: 'forbidden'; message: string }
  | { code: 'not_found'; message: string }
  | { code: 'no_folder'; message: string }
  | { code: 'expired'; message: string; recoverable: true }
  | { code: 'upstream'; message: string }
export type Result<T> = { ok: true; value: T } | { ok: false; error: UploadError }
const fail = <T = never>(error: UploadError): Result<T> => ({ ok: false, error })

type SessionRow = {
  id: string
  agency_id: string
  shoot_id: string
  content_item_id: string
  file_name: string
  file_size_bytes: number
  mime_type: string
  session_uri_enc: string
  bytes_received: number
  status: 'active' | 'complete' | 'expired' | 'failed'
  expires_at: string
  started_by: string
}

/** Loads the session and applies canAccess(). The session URI never leaves this module except via the owner's create/progress calls. */
async function loadOwnedSession(user: User, sessionId: string): Promise<Result<{ row: SessionRow; cameramanId: string | null }>> {
  const { data: row } = await supabaseAdmin.from('upload_sessions').select('*').eq('id', sessionId).maybeSingle()
  if (!row) return fail({ code: 'not_found', message: 'Upload session not found' })
  const { data: shoot } = await supabaseAdmin.from('shoots').select('cameraman_id').eq('id', row.shoot_id).single()
  const allowed = canAccess(
    user,
    { type: 'upload_session', agency_id: row.agency_id, started_by: row.started_by, cameraman_id: shoot?.cameraman_id ?? null },
    'write'
  )
  // admins reach it through the admin branch of canAccess; everyone else must own it
  if (!allowed) return fail({ code: 'forbidden', message: 'Not allowed to use this upload session' })
  return { ok: true, value: { row: row as SessionRow, cameramanId: shoot?.cameraman_id ?? null } }
}

export async function createUploadSession(
  user: User,
  p: { shootId: string; contentItemId: string; fileName: string; fileSizeBytes: number; mimeType: string; origin: string }
): Promise<Result<{ sessionId: string; sessionUri: string; expiresAt: string }>> {
  const { data: shoot } = await supabaseAdmin.from('shoots').select('id, agency_id, cameraman_id, drive_folder_id').eq('id', p.shootId).maybeSingle()
  if (!shoot) return fail({ code: 'not_found', message: 'Shoot not found' })
  const { data: driveState } = await supabaseAdmin.from('drive_sync_state').select('shared_drive_id').eq('agency_id', shoot.agency_id).maybeSingle()
  if (driveState?.shared_drive_id !== env.GOOGLE_SHARED_DRIVE_ID)
    return fail({ code: 'no_folder', message: 'This workspace has no configured Shared Drive' })

  // The idea must actually be linked to this shoot (shoot_items is the join).
  const { data: link } = await supabaseAdmin
    .from('shoot_items')
    .select('drive_subfolder_id')
    .eq('shoot_id', p.shootId)
    .eq('content_item_id', p.contentItemId)
    .maybeSingle()
  if (!link) return fail({ code: 'not_found', message: 'That idea is not part of this shoot' })

  if (!canAccess(user, { type: 'upload_session', agency_id: shoot.agency_id, started_by: user.id, cameraman_id: shoot.cameraman_id }, 'write')) {
    return fail({ code: 'forbidden', message: 'You are not assigned to this shoot' })
  }

  const folderId = link.drive_subfolder_id
  if (!folderId) return fail({ code: 'no_folder', message: 'This idea folder is still being provisioned' })

  const token = await serviceAccountToken()
  // `Origin` binds the session to the app origin so Google answers the browser's later
  // cross-origin chunk PUTs with the right CORS headers.
  const res = await fetch(INIT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': p.mimeType,
      'X-Upload-Content-Length': String(p.fileSizeBytes),
      Origin: p.origin,
    },
    body: JSON.stringify({ name: p.fileName, parents: [folderId], mimeType: p.mimeType }),
  })
  if (!res.ok) return fail({ code: 'upstream', message: `Drive refused the upload session (${res.status})` })
  const sessionUri = res.headers.get('Location')
  if (!sessionUri) return fail({ code: 'upstream', message: 'Drive did not return a session URI' })

  const id = randomUUID()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  const { error } = await supabaseAdmin.from('upload_sessions').insert({
    id,
    agency_id: shoot.agency_id,
    shoot_id: p.shootId,
    content_item_id: p.contentItemId,
    file_name: p.fileName,
    file_size_bytes: p.fileSizeBytes,
    mime_type: p.mimeType,
    session_uri_enc: encrypt(sessionUri),
    bytes_received: 0,
    last_progress_at: new Date().toISOString(),
    status: 'active',
    expires_at: expiresAt,
    started_by: user.id,
  })
  if (error) return fail({ code: 'upstream', message: 'Could not record the upload session' })
  return { ok: true, value: { sessionId: id, sessionUri, expiresAt } }
}

/** The caller's own unexpired, active session for this exact file, if one exists (this is what makes resume possible). */
export async function findActiveSession(
  user: User,
  p: { shootId: string; contentItemId: string; fileName: string; fileSizeBytes: number }
): Promise<{ sessionId: string } | null> {
  const { data } = await supabaseAdmin
    .from('upload_sessions')
    .select('id')
    .eq('started_by', user.id)
    .eq('shoot_id', p.shootId)
    .eq('content_item_id', p.contentItemId)
    .eq('file_name', p.fileName)
    .eq('file_size_bytes', p.fileSizeBytes)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data ? { sessionId: data.id } : null
}

/** Asks Google how many bytes it holds. An expired or unknown session is reported as recoverable. */
export async function getProgress(
  user: User,
  sessionId: string
): Promise<Result<{ sessionUri: string; bytesReceived: number; totalBytes: number; status: SessionRow['status']; completedDriveFileId?: string }>> {
  const loaded = await loadOwnedSession(user, sessionId)
  if (!loaded.ok) return loaded
  const { row } = loaded.value

  const markExpired = async () => {
    await supabaseAdmin.from('upload_sessions').update({ status: 'expired' }).eq('id', row.id)
    return fail<never>({ code: 'expired', message: 'This upload expired. Start a new one and re-pick the file.', recoverable: true })
  }
  if (row.status === 'complete') {
    return { ok: true, value: { sessionUri: '', bytesReceived: row.file_size_bytes, totalBytes: row.file_size_bytes, status: 'complete' } }
  }
  if (row.status === 'expired' || new Date(row.expires_at).getTime() < Date.now()) return markExpired()

  const sessionUri = decrypt(row.session_uri_enc)
  const res = await fetch(sessionUri, {
    method: 'PUT',
    headers: { 'Content-Length': '0', 'Content-Range': `bytes */${row.file_size_bytes}` },
  })
  // 404/410: Google has dropped the session
  if (res.status === 404 || res.status === 410) return markExpired()

  let received = 0
  let completedDriveFileId: string | undefined
  if (res.status === 308) {
    const m = res.headers.get('Range')?.match(/bytes=0-(\d+)/)
    received = m ? Number(m[1]) + 1 : 0
  } else if (res.ok) {
    received = row.file_size_bytes // Google already has the whole file
    completedDriveFileId = ((await res.json().catch(() => null)) as { id?: string } | null)?.id
  } else {
    return fail({ code: 'upstream', message: `Drive progress query failed (${res.status})` })
  }

  await supabaseAdmin.from('upload_sessions').update(received > row.bytes_received
    ? { bytes_received: received, last_progress_at: new Date().toISOString() }
    : { bytes_received: received }).eq('id', row.id)
  return { ok: true, value: { sessionUri, bytesReceived: received, totalBytes: row.file_size_bytes, status: 'active', completedDriveFileId } }
}

/**
 * Records the finished file. Idempotent: replaying with the same Drive file id leaves exactly one raw_files row.
 * The file is re-read from Drive with the service account, so a client cannot claim an arbitrary file id.
 */
export async function completeUpload(user: User, sessionId: string, driveFileId: string): Promise<Result<{ rawFileId: string; driveLink: string }>> {
  const loaded = await loadOwnedSession(user, sessionId)
  if (!loaded.ok) return loaded
  const { row } = loaded.value

  const file = await drive.files
    .get({ fileId: driveFileId, fields: 'id,name,size,mimeType,webViewLink,parents', supportsAllDrives: true })
    .then((r) => r.data)
    .catch(() => null)
  if (!file?.id) return fail({ code: 'not_found', message: 'That file was not found in Drive' })
  if (Number(file.size) !== Number(row.file_size_bytes)) {
    return fail({ code: 'upstream', message: 'The Drive file size does not match the upload' })
  }
  const { data: ideaFolder } = await supabaseAdmin.from('shoot_items').select('drive_subfolder_id').eq('shoot_id', row.shoot_id).eq('content_item_id', row.content_item_id).single()
  if (!ideaFolder?.drive_subfolder_id || !file.parents?.includes(ideaFolder.drive_subfolder_id)) {
    return fail({ code: 'forbidden', message: 'The Drive file is not in this idea folder' })
  }

  const { data: inserted } = await supabaseAdmin
    .from('raw_files')
    .upsert(
      {
        id: randomUUID(),
        agency_id: row.agency_id,
        shoot_id: row.shoot_id,
        content_item_id: row.content_item_id,
        drive_file_id: file.id,
        drive_link: file.webViewLink ?? `https://drive.google.com/file/d/${file.id}/view`,
        file_name: file.name ?? row.file_name,
        size_bytes: Number(file.size),
        mime_type: file.mimeType ?? row.mime_type,
        source: 'wrapper',
      },
      { onConflict: 'drive_file_id', ignoreDuplicates: true }
    )
    .select('id, drive_link')
  const { data: rawFile } = inserted?.length
    ? { data: inserted[0] }
    : await supabaseAdmin.from('raw_files').select('id, drive_link').eq('drive_file_id', file.id).single()
  if (!rawFile) return fail({ code: 'upstream', message: 'Could not record the uploaded file' })

  const now = new Date().toISOString()
  await supabaseAdmin.from('upload_sessions').update({ status: 'complete', bytes_received: row.file_size_bytes, completed_at: now, last_progress_at: now }).eq('id', row.id)
  await supabaseAdmin.from('shoot_items').update({ raw_uploaded_at: now, marked_by: user.id }).eq('shoot_id', row.shoot_id).eq('content_item_id', row.content_item_id)
  const { error: arrivalError } = await supabaseAdmin.rpc('phase4_arrival', { p_shoot_id: row.shoot_id, p_actor_id: user.id, p_source: 'wrapper' })
  if (arrivalError) return fail({ code: 'upstream', message: 'Upload recorded, but shoot arrival needs reconciliation' })
  return { ok: true, value: { rawFileId: rawFile.id, driveLink: rawFile.drive_link } }
}
