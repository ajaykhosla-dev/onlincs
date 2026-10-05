import 'server-only'
import { randomUUID } from 'node:crypto'
import { abortMultipart, createMultipart, headObject, listParts } from '@/lib/b2/presign'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { accessibleLibraryClients } from '@/lib/phase5/data'
import type { User } from '@/types/database'

export const PART_SIZE = 8 * 1024 * 1024
export const MAX_CUT_SIZE = 200 * 1024 * 1024
export class ActiveMediaUploadError extends Error {
  constructor(public sessionId: string | null) { super('An upload is already active for this cut. Cancel it before starting another file.') }
}
export type UploadSession = {
  id: string; agency_id: string; kind: 'cut' | 'library'; content_item_id: string | null
  client_id: string | null; file_name: string; file_size_bytes: number; content_type: string
  b2_key: string; b2_upload_id: string; uploader_id: string; state: 'active' | 'completing' | 'aborting' | 'completed' | 'aborted'
  result_id: string | null
}

export async function getUploadSession(user: User, id: string): Promise<UploadSession | null> {
  const { data, error } = await supabaseAdmin.from('media_upload_sessions').select('*').eq('id',id).maybeSingle()
  if (error) throw error
  const session = data as UploadSession | null
  return session?.agency_id === user.agency_id && session.uploader_id === user.id ? session : null
}

export async function canUploadCut(user: User, itemId: string) {
  if (user.role !== 'editor') return false
  const { data } = await supabaseAdmin.from('content_items').select('agency_id,assigned_editor_id,status').eq('id',itemId).maybeSingle()
  return data?.agency_id === user.agency_id && data.assigned_editor_id === user.id && ['with_editor','changes_requested','client_changes'].includes(data.status)
}

export async function canUploadLibrary(user: User, clientId: string) {
  if (!['admin','editor'].includes(user.role)) return false
  return (await accessibleLibraryClients(user)).some((client) => client.id === clientId)
}

export async function startMediaUpload(user: User, input: {
  kind: 'cut' | 'library'; itemId?: string; clientId?: string; folderName?: string
  fileName: string; fileSize: number; contentType: string
}) {
  if (input.kind === 'cut') {
    if (!input.itemId || !await canUploadCut(user,input.itemId)) return null
    const { data: existing } = await supabaseAdmin.from('media_upload_sessions').select('*')
      .eq('content_item_id',input.itemId).eq('kind','cut').in('state',['active','completing','aborting']).maybeSingle()
    if (existing) {
      if (existing.uploader_id !== user.id) throw new ActiveMediaUploadError(null)
      if (existing.file_name !== input.fileName || existing.file_size_bytes !== input.fileSize)
        throw new ActiveMediaUploadError(existing.id)
      if (existing.state === 'aborting') throw new ActiveMediaUploadError(existing.id)
      if (existing.state === 'completing')
        return { id:existing.id,partSize:PART_SIZE,uploadedParts:Math.ceil(existing.file_size_bytes/PART_SIZE) }
      const listed = await listParts(existing.b2_key,existing.b2_upload_id)
      let uploadedParts = 0
      for (const part of listed.Parts ?? []) {
        if (part.PartNumber !== uploadedParts+1) break
        uploadedParts++
      }
      return { id: existing.id, partSize: PART_SIZE, uploadedParts }
    }
  } else if (!input.clientId || !await canUploadLibrary(user,input.clientId)) return null
  const id = randomUUID()
  const ext = input.kind === 'cut' ? 'mp4' : (input.fileName.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,8)
  const key = input.kind === 'cut'
    ? `${user.agency_id}/cuts/${input.itemId}/${id}.mp4`
    : `${user.agency_id}/library/${input.clientId}/${id}.${ext || 'bin'}`
  const uploadId = await createMultipart(key, input.contentType)
  const { error } = await supabaseAdmin.from('media_upload_sessions').insert({
    id, agency_id: user.agency_id, kind: input.kind, content_item_id: input.kind === 'cut' ? input.itemId : null,
    client_id: input.kind === 'library' ? input.clientId : null, folder_name: input.folderName ?? null,
    file_name: input.fileName, content_type: input.contentType, file_size_bytes: input.fileSize,
    b2_key: key, b2_upload_id: uploadId, uploader_id: user.id,
  })
  if (error) { await abortMultipart(key,uploadId).catch(() => {}); throw error }
  return { id, partSize: PART_SIZE }
}

export async function uploadedObjectMatches(session: UploadSession) {
  try {
    const object = await headObject(session.b2_key)
    return object.ContentLength === session.file_size_bytes
  } catch { return false }
}
