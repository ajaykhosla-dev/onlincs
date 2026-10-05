import 'server-only'
import { accessibleClients } from '@/lib/phase3/data'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { User } from '@/types/database'

export type CardRow = { id: string; title: string; client: string; detail: string; href: string }
export type Cards = {
  activeClients: CardRow[]
  waiting: CardRow[]
  pastDeadline: CardRow[]
  overduePosts: CardRow[]
}

const label = (value: string) => value.replaceAll('_', ' ')

/**
 * The numbers on the metric cards are the lengths of these arrays, so a card and the rows it drills into can never disagree.
 * Everything is limited to the clients this person may see.
 */
export async function dashboardCards(user: User): Promise<Cards> {
  const clients = await accessibleClients(user)
  const ids = clients.map((client) => client.id)
  const names = new Map(clients.map((client) => [client.id, client.name]))
  const base = user.role === 'admin' || user.role === 'platform_owner' ? '/admin' : '/manager'
  if (!ids.length) return { activeClients: [], waiting: [], pastDeadline: [], overduePosts: [] }
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  const [items, posts] = await Promise.all([
    supabaseAdmin.from('content_items').select('id,client_id,title,status,deadline').in('client_id', ids)
      .in('status', ['cut_submitted', 'internally_approved', 'with_client', 'with_editor', 'changes_requested', 'client_changes']),
    supabaseAdmin.from('post_schedule').select('id,content_item_id,scheduled_at').eq('agency_id', user.agency_id).is('posted_at', null).lt('scheduled_at', new Date().toISOString()),
  ])
  if (items.error || posts.error) throw new Error((items.error ?? posts.error)!.message)
  const waitingStatuses = new Set(['cut_submitted', 'internally_approved', 'with_client'])
  const editStatuses = new Set(['with_editor', 'changes_requested', 'client_changes'])
  const postItemIds = (posts.data ?? []).map((post) => post.content_item_id)
  const { data: postItems, error } = postItemIds.length
    ? await supabaseAdmin.from('content_items').select('id,client_id,title,status').in('id', postItemIds) : { data: [], error: null }
  if (error) throw new Error(error.message)
  const postItemById = new Map((postItems ?? []).map((item) => [item.id, item]))
  return {
    activeClients: clients.filter((client) => client.status === 'active').map((client) => ({ id: client.id, title: client.name, client: client.niche, detail: client.handle, href: `${base}/clients` })),
    waiting: (items.data ?? []).filter((item) => waitingStatuses.has(item.status)).map((item) => ({
      id: item.id, title: item.title, client: names.get(item.client_id) ?? '', detail: label(item.status), href: `${base}/den` })),
    pastDeadline: (items.data ?? []).filter((item) => editStatuses.has(item.status) && item.deadline && item.deadline < today).map((item) => ({
      id: item.id, title: item.title, client: names.get(item.client_id) ?? '', detail: `due ${item.deadline} · ${label(item.status)}`, href: `${base}/den` })),
    overduePosts: (posts.data ?? []).flatMap((post) => {
      const item = postItemById.get(post.content_item_id)
      if (!item || item.status === 'archived' || !names.has(item.client_id)) return []
      return [{ id: post.id, title: item.title, client: names.get(item.client_id)!, detail: `was due ${new Date(post.scheduled_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}`, href: `${base}/posting` }]
    }),
  }
}
