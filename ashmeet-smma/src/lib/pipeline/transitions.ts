import 'server-only'
import { canAccess } from '@/lib/auth/can-access'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { validateTransition, TransitionError } from './policy'
import type { Client, ContentItem, ContentStatus, User } from '@/types/database'

export { TransitionError } from './policy'

/** The only application path for an item status change. The RPC locks, updates and logs in one transaction. */
export async function transition(itemId: string, toStatus: ContentStatus, actor: User, clientId?: string): Promise<ContentItem> {
  const { data: item, error } = await supabaseAdmin.from('content_items').select('*').eq('id', itemId).maybeSingle()
  if (error) throw error
  if (!item) throw new TransitionError('Content item not found', 404)
  if (clientId && item.client_id !== clientId) throw new TransitionError('Content item not found for this client', 404)
  const { data: client } = await supabaseAdmin.from('clients').select('*').eq('id', item.client_id).maybeSingle()
  if (!client) throw new TransitionError('Client not found', 404)
  if (!canAccess(actor, { type: 'content_item', agency_id: item.agency_id, client_manager_id: (client as Client).manager_id, assigned_editor_id: item.assigned_editor_id, shoot_cameraman_ids: [] }, 'write')) throw new TransitionError('You do not have access to this content item', 403)
  validateTransition(item.status as ContentStatus, toStatus, actor.role)
  const { data, error: mutationError } = await supabaseAdmin.rpc('phase3_transition', { p_item_id: itemId, p_to_status: toStatus, p_actor_id: actor.id, p_expected_status: item.status })
  if (mutationError) throw new TransitionError(mutationError.message, 409)
  return data as ContentItem
}
