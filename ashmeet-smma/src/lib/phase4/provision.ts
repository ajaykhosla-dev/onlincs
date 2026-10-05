import 'server-only'
import { ensureFolder, folderLink } from '@/lib/drive/folders'
import { driveFor } from '@/lib/integrations/credentials'
import { supabaseAdmin } from '@/lib/supabase/admin'

function istDate(value: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value))
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

/** A durable folder job; callers may retry and existing Drive folders are reused by name. */
export async function provisionShoot(shootId: string): Promise<{ status: string }> {
  const { data: claimed, error: claimError } = await supabaseAdmin.from('shoot_folder_jobs')
    .update({ status: 'running', updated_at: new Date().toISOString() })
    .eq('shoot_id', shootId).in('status', ['pending', 'failed']).select('shoot_id,attempts').maybeSingle()
  if (claimError) throw claimError
  if (!claimed) {
    const { data: job } = await supabaseAdmin.from('shoot_folder_jobs').select('status').eq('shoot_id', shootId).maybeSingle()
    if (!job) {
      const { data: shoot } = await supabaseAdmin.from('shoots').select('agency_id').eq('id', shootId).maybeSingle()
      if (!shoot) return { status: 'not_found' }
      const { error } = await supabaseAdmin.from('shoot_folder_jobs').upsert({ shoot_id: shootId, agency_id: shoot.agency_id, status: 'pending' }, { onConflict: 'shoot_id', ignoreDuplicates: true })
      if (error) throw error
      return provisionShoot(shootId)
    }
    return { status: job?.status ?? 'not_found' }
  }
  try {
    const { data: shoot, error: shootError } = await supabaseAdmin.from('shoots').select('*').eq('id', shootId).single()
    if (shootError || !shoot) throw new Error('Shoot not found')
    const ctx = await driveFor(shoot.agency_id)
    if (!ctx) throw new Error('Workspace Shared Drive is not configured')
    const { drive } = ctx
    const { data: client, error: clientError } = await supabaseAdmin.from('clients').select('name').eq('id', shoot.client_id).single()
    if (clientError || !client) throw new Error('Client not found')
    const { data: links, error: linkError } = await supabaseAdmin.from('shoot_items').select('content_item_id,idea_slug,drive_subfolder_id').eq('shoot_id', shootId)
    if (linkError || !links?.length) throw new Error('Shoot has no content items')
    const day = istDate(shoot.scheduled_start)
    const clientFolder = await ensureFolder(ctx, client.name, null)
    const monthFolder = await ensureFolder(ctx, day.slice(0, 7), clientFolder)
    const shootName = `${day} ${shoot.title}`
    let shootFolder = shoot.drive_folder_id as string | null
    if (shootFolder) {
      const current = await drive.files.get({ fileId: shootFolder, fields: 'id,name,parents', supportsAllDrives: true })
      const oldParents = current.data.parents ?? []
      if (current.data.name !== shootName || !oldParents.includes(monthFolder)) {
        await drive.files.update({ fileId: shootFolder, requestBody: { name: shootName }, supportsAllDrives: true,
          addParents: oldParents.includes(monthFolder) ? undefined : monthFolder,
          removeParents: oldParents.includes(monthFolder) ? undefined : oldParents.join(',') })
      }
    } else shootFolder = await ensureFolder(ctx, shootName, monthFolder)
    const { error: folderError } = await supabaseAdmin.from('shoots').update({ drive_folder_id: shootFolder, drive_folder_link: folderLink(shootFolder) }).eq('id', shootId)
    if (folderError) throw folderError
    for (const link of links) {
      if (link.drive_subfolder_id && !link.drive_subfolder_id.startsWith('dr-sh')) continue
      const folder = await ensureFolder(ctx, link.idea_slug || link.content_item_id, shootFolder)
      const { error } = await supabaseAdmin.from('shoot_items').update({ drive_subfolder_id: folder, drive_subfolder_link: folderLink(folder) })
        .eq('shoot_id', shootId).eq('content_item_id', link.content_item_id)
      if (error) throw error
    }
    await supabaseAdmin.from('shoot_folder_jobs').update({ status: 'complete', last_error: null, attempts: claimed.attempts + 1, updated_at: new Date().toISOString() }).eq('shoot_id', shootId).eq('status', 'running')
    return { status: 'complete' }
  } catch {
    await supabaseAdmin.from('shoot_folder_jobs').update({ status: 'failed', last_error: 'Drive folder provisioning failed', attempts: claimed.attempts + 1, updated_at: new Date().toISOString() }).eq('shoot_id', shootId).eq('status', 'running')
    return { status: 'failed' }
  }
}
