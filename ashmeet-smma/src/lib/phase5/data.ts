import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { User } from '@/types/database'

export type MediaVersion = {
  id: string; content_item_id: string; version: number; file_size_bytes: number
  duration_seconds: number | null; uploaded_by: string; uploaded_at: string; status: string
}
export type EditorWork = {
  id: string; client_id: string; client_name: string; title: string; status: string
  deadline: string | null; concept: string | null; script: string | null
  instructions_editor: string | null; original_instructions: string | null
  reference_links: string[]; assigned_editor_id: string | null
  versions: MediaVersion[]; comments: { id: string; author_label: string; body: string; timestamp_start: number | null; created_at: string }[]
  raw: { name: string; url: string }[]; folder_urls: string[]
}

function check(error: { message: string } | null) { if (error) throw new Error(error.message) }

export async function editorWork(user: User): Promise<EditorWork[]> {
  if (user.role !== 'editor') return []
  const itemsResult = await supabaseAdmin.from('content_items').select('id,client_id,title,status,deadline,concept,script,instructions_editor,reference_links,assigned_editor_id')
    .eq('agency_id', user.agency_id).eq('assigned_editor_id', user.id).in('status', ['with_editor','changes_requested','cut_submitted'])
    .order('deadline', { ascending: true, nullsFirst: false })
  check(itemsResult.error)
  const items = itemsResult.data ?? []
  if (!items.length) return []
  const ids = items.map((item) => item.id)
  const clientIds = [...new Set(items.map((item) => item.client_id))]
  const [clients, versions, links, logs] = await Promise.all([
    supabaseAdmin.from('clients').select('id,name').in('id', clientIds),
    supabaseAdmin.from('deliverable_versions').select('id,content_item_id,version,file_size_bytes,duration_seconds,uploaded_by,uploaded_at,status').in('content_item_id', ids).order('version'),
    supabaseAdmin.from('shoot_items').select('shoot_id,content_item_id,drive_subfolder_link').in('content_item_id', ids),
    supabaseAdmin.from('activity_log').select('entity_id,metadata,created_at').eq('action','created').eq('entity_type','content_item').in('entity_id',ids).order('created_at'),
  ])
  for (const result of [clients, versions, links, logs]) check(result.error)
  const versionIds = (versions.data ?? []).map((version) => version.id)
  const shootIds = [...new Set((links.data ?? []).map((link) => link.shoot_id))]
  const [comments, raw] = await Promise.all([
    versionIds.length ? supabaseAdmin.from('comments').select('id,version_id,author_label,body,timestamp_start,created_at').in('version_id', versionIds).order('created_at') : Promise.resolve({ data: [], error: null }),
    shootIds.length ? supabaseAdmin.from('raw_files').select('shoot_id,content_item_id,file_name,drive_link').in('shoot_id', shootIds).in('content_item_id', ids) : Promise.resolve({ data: [], error: null }),
  ])
  check(comments.error); check(raw.error)
  const clientNames = new Map((clients.data ?? []).map((client) => [client.id, client.name]))
  return items.map((item) => {
    const itemVersions = (versions.data ?? []).filter((version) => version.content_item_id === item.id)
    const versionIds = new Set(itemVersions.map((version) => version.id))
    const itemLinks = (links.data ?? []).filter((link) => link.content_item_id === item.id)
    const shoots = new Set(itemLinks.map((link) => link.shoot_id))
    const firstLog = (logs.data ?? []).find((log) => log.entity_id === item.id)
    const meta = firstLog?.metadata as Record<string, unknown> | null
    return {
      ...item, client_name: clientNames.get(item.client_id) ?? 'Client',
      reference_links: Array.isArray(item.reference_links) ? item.reference_links as string[] : [],
      original_instructions: typeof meta?.instructions_editor === 'string' ? meta.instructions_editor : null,
      versions: itemVersions,
      comments: (comments.data ?? []).filter((comment) => versionIds.has(comment.version_id)),
      raw: (raw.data ?? []).filter((file) => file.content_item_id === item.id && shoots.has(file.shoot_id))
        .map((file) => ({ name: file.file_name, url: file.drive_link })),
      folder_urls: [...new Set(itemLinks.map((link) => link.drive_subfolder_link).filter((url): url is string => !!url))],
    }
  })
}

export async function denData(user: User) {
  if (!['admin','brand_manager'].includes(user.role)) return { items: [], editors: [] }
  const [clients, editors, items, versions] = await Promise.all([
    supabaseAdmin.from('clients').select('id,name,manager_id').eq('agency_id', user.agency_id),
    supabaseAdmin.from('users').select('id,full_name').eq('agency_id',user.agency_id).eq('role','editor').eq('is_active',true).order('full_name'),
    supabaseAdmin.from('content_items').select('id,client_id,title,status,deadline,assigned_editor_id').eq('agency_id',user.agency_id)
      .order('deadline',{ascending:true,nullsFirst:false}),
    supabaseAdmin.from('deliverable_versions').select('id,content_item_id,version,file_size_bytes,duration_seconds,uploaded_by,uploaded_at,status').eq('agency_id',user.agency_id).order('version'),
  ])
  for (const result of [clients, editors, items, versions]) check(result.error)
  const allowed = new Map((clients.data ?? []).filter((client) => user.role === 'admin' || client.manager_id === user.id).map((client) => [client.id,client.name]))
  const versioned = new Set((versions.data ?? []).map((version) => version.content_item_id))
  const activeStatuses = new Set(['raw_uploaded','changes_requested','with_editor','cut_submitted'])
  const visible = (items.data ?? []).filter((item) => allowed.has(item.client_id) && (activeStatuses.has(item.status) || versioned.has(item.id)))
  const load = new Map<string,number>()
  for (const item of items.data ?? []) if (item.status === 'with_editor' && item.assigned_editor_id)
    load.set(item.assigned_editor_id,(load.get(item.assigned_editor_id) ?? 0)+1)
  return {
    editors: (editors.data ?? []).map((editor) => ({ ...editor, load: load.get(editor.id) ?? 0 })),
    items: visible.map((item) => ({ ...item, client_name: allowed.get(item.client_id) ?? 'Client',
      versions: (versions.data ?? []).filter((version) => version.content_item_id === item.id) })),
  }
}

export async function accessibleLibraryClients(user: User) {
  const [clients, work] = await Promise.all([
    supabaseAdmin.from('clients').select('id,name').eq('agency_id',user.agency_id).order('name'),
    user.role === 'editor' ? supabaseAdmin.from('content_items').select('client_id').eq('agency_id',user.agency_id).eq('assigned_editor_id',user.id)
      : Promise.resolve({ data: [], error: null }),
  ])
  check(clients.error); check(work.error)
  const assigned = new Set((work.data ?? []).map((item) => item.client_id))
  return (clients.data ?? []).filter((client) => user.role === 'admin' || (user.role === 'editor' && assigned.has(client.id)))
}

export async function libraryData(user: User) {
  const clients = await accessibleLibraryClients(user)
  if (!clients.length) return { clients: [], assets: [] }
  const { data, error } = await supabaseAdmin.from('library_assets').select('id,client_id,folder_name,name,kind,file_size_bytes,created_at')
    .eq('agency_id',user.agency_id).in('client_id',clients.map((client) => client.id)).order('created_at',{ascending:false})
  check(error)
  return { clients, assets: data ?? [] }
}
