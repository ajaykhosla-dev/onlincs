import 'server-only'
import { canAccess } from '@/lib/auth/can-access'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Client, ContentItem, Shoot, ShootItem, User } from '@/types/database'

export type ShootIdea = ShootItem & {
  item: Pick<ContentItem, 'id' | 'title' | 'concept' | 'script' | 'reference_links' | 'assigned_editor_id' | 'status'>
  files: { id: string; file_name: string; size_bytes: number; drive_link: string }[]
  activeUploads: { id: string; file_name: string; file_size_bytes: number; bytes_received: number; expires_at: string; last_progress_at: string | null }[]
}
export type ShootView = Shoot & {
  client: Pick<Client, 'id' | 'name' | 'manager_id'>
  cameraman_name: string
  folder_status: string
  ideas: ShootIdea[]
}

export async function shootsFor(user: User): Promise<ShootView[]> {
  const { data: shoots, error } = await supabaseAdmin.from('shoots').select('*').eq('agency_id', user.agency_id).order('scheduled_start')
  if (error) throw error
  if (!shoots?.length) return []
  const clientIds = [...new Set(shoots.map((s) => s.client_id))]
  const shootIds = shoots.map((s) => s.id)
  const [clients, links, files, sessions, jobs, users] = await Promise.all([
    supabaseAdmin.from('clients').select('id,name,manager_id,agency_id').in('id', clientIds),
    supabaseAdmin.from('shoot_items').select('*').in('shoot_id', shootIds),
    supabaseAdmin.from('raw_files').select('id,shoot_id,content_item_id,file_name,size_bytes,drive_link').in('shoot_id', shootIds),
    supabaseAdmin.from('upload_sessions').select('id,shoot_id,content_item_id,file_name,file_size_bytes,bytes_received,expires_at,last_progress_at').in('shoot_id', shootIds).eq('status', 'active'),
    supabaseAdmin.from('shoot_folder_jobs').select('shoot_id,status').in('shoot_id', shootIds),
    supabaseAdmin.from('users').select('id,full_name').eq('agency_id', user.agency_id),
  ])
  const fault = clients.error ?? links.error ?? files.error ?? sessions.error ?? jobs.error ?? users.error
  if (fault) throw fault
  const itemIds = [...new Set((links.data ?? []).map((link) => link.content_item_id))]
  const items = itemIds.length ? await supabaseAdmin.from('content_items').select('id,title,concept,script,reference_links,assigned_editor_id,status').in('id', itemIds) : { data: [], error: null }
  if (items.error) throw items.error
  const clientById = new Map((clients.data ?? []).map((c) => [c.id, c]))
  const itemById = new Map((items.data ?? []).map((i) => [i.id, i]))
  const names = new Map((users.data ?? []).map((u) => [u.id, u.full_name]))
  return shoots.flatMap((shoot) => {
    const client = clientById.get(shoot.client_id)
    if (!client) return []
    const resource = { type: 'shoot' as const, agency_id: shoot.agency_id, client_manager_id: client.manager_id, cameraman_id: shoot.cameraman_id }
    const editorAssigned = (links.data ?? []).some((link) => link.shoot_id === shoot.id && itemById.get(link.content_item_id)?.assigned_editor_id === user.id)
    if (!canAccess(user, resource, 'read') && !(user.role === 'editor' && editorAssigned)) return []
    return [{ ...shoot, client: { id: client.id, name: client.name, manager_id: client.manager_id },
      cameraman_name: names.get(shoot.cameraman_id) ?? 'Unassigned',
      folder_status: (jobs.data ?? []).find((job) => job.shoot_id === shoot.id)?.status ?? (shoot.drive_folder_id ? 'complete' : 'pending'),
      ideas: (links.data ?? []).filter((link) => link.shoot_id === shoot.id).flatMap((link) => {
        const item = itemById.get(link.content_item_id)
        if (!item || (user.role === 'editor' && item.assigned_editor_id !== user.id)) return []
        return [{ ...link, item, files: (files.data ?? []).filter((file) => file.shoot_id === shoot.id && file.content_item_id === item.id),
          activeUploads: (sessions.data ?? []).filter((s) => s.shoot_id === shoot.id && s.content_item_id === item.id) }]
      }),
    } as ShootView]
  })
}

export async function shootFor(user: User, id: string): Promise<ShootView | null> {
  return (await shootsFor(user)).find((shoot) => shoot.id === id) ?? null
}
