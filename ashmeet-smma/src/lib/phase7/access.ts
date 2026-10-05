import 'server-only'
import { canAccess, type Action } from '@/lib/auth/can-access'
import { isReviewer, rpcStatus } from '@/lib/phase6/review'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { User } from '@/types/database'

export { rpcStatus }

/** Posting is run by admins and the brand manager who owns the client; everyone else is refused. */
async function allowed(user: User, itemId: string, action: Action) {
  if (!isReviewer(user)) return null
  const { data: item } = await supabaseAdmin.from('content_items').select('id,agency_id,client_id,title,status,assigned_editor_id').eq('id', itemId).maybeSingle()
  if (!item) return null
  const { data: client } = await supabaseAdmin.from('clients').select('name,manager_id').eq('id', item.client_id).maybeSingle()
  const ok = canAccess(user, { type: 'content_item', agency_id: item.agency_id, client_manager_id: client?.manager_id ?? null,
    assigned_editor_id: item.assigned_editor_id, shoot_cameraman_ids: [] }, action)
  return ok ? { item, clientName: client?.name ?? 'Client' } : null
}

export const itemAccess = allowed

export async function postAccess(user: User, postId: string, action: Action) {
  const { data: post } = await supabaseAdmin.from('post_schedule').select('id,agency_id,content_item_id,scheduled_at,posted_at').eq('id', postId).maybeSingle()
  if (!post) return null
  const found = await allowed(user, post.content_item_id, action)
  return found ? { post, ...found } : null
}
