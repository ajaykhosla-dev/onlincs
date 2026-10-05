import 'server-only'
import { randomUUID } from 'node:crypto'
import { driveFor, type DriveContext } from '@/lib/integrations/credentials'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { provisionShoot } from './provision'
import { pushAfterResponse } from '@/lib/push/send'

type DriveFile = { id?: string | null; name?: string | null; size?: string | null; mimeType?: string | null; webViewLink?: string | null; parents?: string[] | null; trashed?: boolean | null }

async function record(file: DriveFile, folders: Map<string, { shoot_id: string; content_item_id: string; agency_id: string }>) {
  if (!file.id || !file.size || !file.parents?.length || file.trashed || file.mimeType === 'application/vnd.google-apps.folder') return false
  const match = file.parents.map((p) => folders.get(p)).find(Boolean)
  if (!match) return false
  const { error } = await supabaseAdmin.from('raw_files').upsert({ id: randomUUID(), agency_id: match.agency_id,
    shoot_id: match.shoot_id, content_item_id: match.content_item_id, drive_file_id: file.id,
    drive_link: file.webViewLink ?? `https://drive.google.com/file/d/${file.id}/view`, file_name: file.name ?? file.id,
    size_bytes: Number(file.size), mime_type: file.mimeType ?? 'application/octet-stream', source: 'drive_sync',
  }, { onConflict: 'drive_file_id', ignoreDuplicates: true })
  if (error) throw error
  const { error: markError } = await supabaseAdmin.from('shoot_items').update({ raw_uploaded_at: new Date().toISOString() })
    .eq('shoot_id', match.shoot_id).eq('content_item_id', match.content_item_id).is('raw_uploaded_at', null)
  if (markError) throw markError
  const { error: arrivalError } = await supabaseAdmin.rpc('phase4_arrival', { p_shoot_id: match.shoot_id, p_actor_id: null, p_source: 'drive_sync' })
  if (arrivalError) throw arrivalError
  pushAfterResponse()
  return true
}

type SyncState = { agency_id: string; shared_drive_id: string; page_token: string | null }

/** Hourly safety net for every agency that has Drive configured. Each agency is synced with its own credentials. */
export async function runPhase4Sync() {
  const { data: states, error } = await supabaseAdmin.from('drive_sync_state').select('agency_id,shared_drive_id,page_token')
  if (error) throw error
  const total = { detected: 0, folderJobs: 0, initialized: false, agencies: 0 }
  for (const state of (states ?? []) as SyncState[]) {
    const ctx = await driveFor(state.agency_id)
    if (!ctx || ctx.driveId !== state.shared_drive_id) continue
    try {
      const result = await syncAgency(state, ctx)
      total.detected += result.detected; total.folderJobs += result.folderJobs; total.initialized ||= result.initialized; total.agencies++
    } catch (cause) { console.error('Drive sync failed for an agency', state.agency_id, cause instanceof Error ? cause.message : cause) }
  }
  if (!total.agencies) throw new Error('Drive sync state is missing')
  return total
}

async function syncAgency(state: SyncState, ctx: DriveContext) {
  const { drive } = ctx
  const { data: unprovisioned, error: shootError } = await supabaseAdmin.from('shoots').select('id,agency_id').eq('agency_id', state.agency_id).is('drive_folder_id', null).neq('status', 'cancelled')
  if (shootError) throw shootError
  for (const shoot of unprovisioned ?? []) {
    const { error } = await supabaseAdmin.from('shoot_folder_jobs').upsert({ shoot_id: shoot.id, agency_id: shoot.agency_id, status: 'pending' }, { onConflict: 'shoot_id', ignoreDuplicates: true })
    if (error) throw error
  }
  const stale = new Date(Date.now() - 15 * 60000).toISOString()
  const { data: jobs, error: jobError } = await supabaseAdmin.from('shoot_folder_jobs').select('shoot_id').eq('agency_id', state.agency_id)
    .or(`status.eq.pending,status.eq.failed,and(status.eq.running,updated_at.lt.${stale})`).limit(50)
  if (jobError) throw jobError
  for (const job of jobs ?? []) {
    await supabaseAdmin.from('shoot_folder_jobs').update({ status: 'failed' }).eq('shoot_id', job.shoot_id).eq('status', 'running').lt('updated_at', stale)
    await provisionShoot(job.shoot_id)
  }
  const { data: links, error: linkError } = await supabaseAdmin.from('shoot_items').select('shoot_id,content_item_id,drive_subfolder_id,shoots!inner(agency_id)')
    .not('drive_subfolder_id', 'is', null)
  if (linkError) throw linkError
  const folders = new Map<string, { shoot_id: string; content_item_id: string; agency_id: string }>()
  for (const link of links ?? []) {
    const shoot = link.shoots as unknown as { agency_id: string }
    if (shoot.agency_id === state.agency_id && link.drive_subfolder_id)
      folders.set(link.drive_subfolder_id, { shoot_id: link.shoot_id, content_item_id: link.content_item_id, agency_id: state.agency_id })
  }
  let detected = 0
  if (!state.page_token) {
    // First run also scans current idea folders so existing manually placed files are not lost.
    const initial = await drive.changes.getStartPageToken({ driveId: ctx.driveId, supportsAllDrives: true })
    if (!initial.data.startPageToken) throw new Error('Drive did not provide a start page token')
    for (const folderId of folders.keys()) {
      let pageToken: string | undefined
      do {
        const page = await drive.files.list({ q: `'${folderId}' in parents and trashed=false`, fields: 'nextPageToken,files(id,name,size,mimeType,webViewLink,parents,trashed)',
          pageSize: 1000, pageToken, corpora: 'drive', driveId: ctx.driveId, includeItemsFromAllDrives: true, supportsAllDrives: true })
        for (const file of page.data.files ?? []) if (await record(file, folders)) detected++
        pageToken = page.data.nextPageToken ?? undefined
      } while (pageToken)
    }
    const { error } = await supabaseAdmin.from('drive_sync_state').update({ page_token: initial.data.startPageToken, last_polled_at: new Date().toISOString() }).eq('agency_id', state.agency_id)
    if (error) throw error
    return { detected, folderJobs: jobs?.length ?? 0, initialized: true }
  }
  let pageToken = state.page_token
  do {
    const page = await drive.changes.list({ pageToken, driveId: ctx.driveId, supportsAllDrives: true,
      includeItemsFromAllDrives: true, fields: 'nextPageToken,newStartPageToken,changes(fileId,removed,file(id,name,size,mimeType,webViewLink,parents,trashed))', pageSize: 1000 })
    for (const change of page.data.changes ?? []) if (!change.removed && change.file && await record(change.file, folders)) detected++
    const next = page.data.nextPageToken ?? page.data.newStartPageToken
    if (!next) throw new Error('Drive did not return a next cursor')
    const { error } = await supabaseAdmin.from('drive_sync_state').update({ page_token: next, last_polled_at: new Date().toISOString() }).eq('agency_id', state.agency_id)
    if (error) throw error
    pageToken = page.data.nextPageToken ?? ''
  } while (pageToken)
  return { detected, folderJobs: jobs?.length ?? 0, initialized: false }
}
