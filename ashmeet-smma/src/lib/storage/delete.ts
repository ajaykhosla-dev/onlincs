import 'server-only'
import { randomUUID } from 'node:crypto'
import { driveFor, type DriveContext } from '@/lib/integrations/credentials'
import { RetryExhaustedError, withRetry } from '@/lib/retry'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { eligibleShoot } from './usage'
import type { User } from '@/types/database'

export type DeleteResult = { ok: true; shoot_id: string; freed: number; files: number; trashed: boolean } | { ok: false; shoot_id: string; message: string }

/** Removes a shoot's folder from Drive (permanently if the service account may, otherwise into the Shared Drive trash). */
async function removeFolder(ctx: DriveContext, folderId: string): Promise<{ trashed: boolean }> {
  const { drive } = ctx
  try {
    await withRetry(() => drive.files.delete({ fileId: folderId, supportsAllDrives: true }), { service: 'Google Drive' })
    return { trashed: false }
  } catch (error) {
    const status = (error as { code?: number; status?: number }).code ?? (error as { status?: number }).status
    if (status === 404) return { trashed: false } // already gone
    if (status !== 403) throw error
    await withRetry(() => drive.files.update({ fileId: folderId, supportsAllDrives: true, requestBody: { trashed: true } }), { service: 'Google Drive' })
    return { trashed: true }
  }
}

/** Deletion is explicit and irreversible, so eligibility is re-checked here, on the server, for every shoot. */
export async function deleteShootRaw(user: User, shootId: string): Promise<DeleteResult> {
  const shoot = await eligibleShoot(user, shootId)
  if (!shoot) return { ok: false, shoot_id: shootId, message: 'This shoot is not eligible for deletion.' }
  const { data: row } = await supabaseAdmin.from('shoots').select('drive_folder_id').eq('id', shootId).eq('agency_id', user.agency_id).maybeSingle()
  let trashed = false
  try {
    if (row?.drive_folder_id) {
      const ctx = await driveFor(user.agency_id)
      if (!ctx) throw new Error('Drive is not configured')
      trashed = (await removeFolder(ctx, row.drive_folder_id)).trashed
    }
  } catch (error) {
    // Nothing in the database changes if Drive did not confirm, so the shoot can simply be retried.
    return { ok: false, shoot_id: shootId, message: error instanceof RetryExhaustedError ? error.message : 'Google Drive refused the deletion. Nothing was removed.' }
  }
  const { error: deleteError } = await supabaseAdmin.from('raw_files').delete().eq('shoot_id', shootId).eq('agency_id', user.agency_id)
  if (deleteError) return { ok: false, shoot_id: shootId, message: 'The Drive folder was removed but the file records could not be cleared. Try again.' }
  await supabaseAdmin.from('shoots').update({ drive_folder_id: null, drive_folder_link: null }).eq('id', shootId)
  await supabaseAdmin.from('shoot_items').update({ drive_subfolder_id: null, drive_subfolder_link: null }).eq('shoot_id', shootId)
  await supabaseAdmin.from('activity_log').insert({ id: randomUUID(), agency_id: user.agency_id, actor_id: user.id, actor_type: 'user', entity_type: 'shoot', entity_id: shootId,
    action: 'raw_deleted', metadata: { freed_bytes: shoot.bytes, files: shoot.files, client: shoot.client, title: shoot.title, drive: trashed ? 'trashed' : 'deleted', folder_id: row?.drive_folder_id ?? null } })
  return { ok: true, shoot_id: shootId, freed: shoot.bytes, files: shoot.files, trashed }
}

/** Total of file sizes in the Shared Drive as Drive itself reports them, to compare with what the app has recorded. */
export async function driveReportedBytes(agencyId: string): Promise<number> {
  const ctx = await driveFor(agencyId)
  if (!ctx) throw new Error('Drive is not configured')
  const { drive } = ctx
  let total = 0, pageToken: string | undefined
  do {
    const page = await withRetry(() => drive.files.list({
      corpora: 'drive', driveId: ctx.driveId, includeItemsFromAllDrives: true, supportsAllDrives: true, pageSize: 1000, pageToken,
      q: "trashed=false and mimeType!='application/vnd.google-apps.folder'", fields: 'nextPageToken,files(size)' }), { service: 'Google Drive' })
    for (const file of page.data.files ?? []) total += Number(file.size ?? 0)
    pageToken = page.data.nextPageToken ?? undefined
  } while (pageToken)
  return total
}
