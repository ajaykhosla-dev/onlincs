import 'server-only'
import { accessibleClients } from '@/lib/phase3/data'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { istMonthBounds, NEARBY_MINUTES } from './format'
import type { User } from '@/types/database'

export type PostRow = {
  id: string; content_item_id: string; client_id: string; client_name: string; title: string; type: string
  item_status: string; scheduled_at: string; caption: string; bg_music_ref: string | null
  posted_at: string | null; posted_by: string | null
}
type RawPost = { id: string; content_item_id: string; scheduled_at: string; caption: string | null
  bg_music_ref: string | null; posted_at: string | null; posted_by: string | null }
const COLUMNS = 'id,content_item_id,scheduled_at,caption,bg_music_ref,posted_at,posted_by'

function check(error: { message: string } | null) { if (error) throw new Error(error.message) }

/** Joins post rows to their item and client, keeping only clients this person may see. */
async function hydrate(user: User, posts: RawPost[]): Promise<PostRow[]> {
  if (!posts.length) return []
  const [clients, items] = await Promise.all([
    accessibleClients(user),
    supabaseAdmin.from('content_items').select('id,client_id,title,type,status').in('id', posts.map((post) => post.content_item_id)),
  ])
  check(items.error)
  const names = new Map(clients.map((client) => [client.id, client.name]))
  const byItem = new Map((items.data ?? []).map((item) => [item.id, item]))
  const rows: PostRow[] = []
  for (const post of posts) {
    const item = byItem.get(post.content_item_id)
    if (!item || !names.has(item.client_id)) continue
    rows.push({ id: post.id, content_item_id: item.id, client_id: item.client_id, client_name: names.get(item.client_id)!,
      title: item.title, type: item.type, item_status: item.status, scheduled_at: post.scheduled_at, caption: post.caption ?? '',
      bg_music_ref: post.bg_music_ref, posted_at: post.posted_at, posted_by: post.posted_by })
  }
  return rows
}

/** Posts for one IST month, the overdue list (all time, oldest first), this week's upcoming and the items ready to schedule. */
export async function postingData(user: User, month: string) {
  const { start, end } = istMonthBounds(month)
  const now = new Date().toISOString()
  const week = new Date(Date.now() + 7 * 864e5).toISOString()
  const base = () => supabaseAdmin.from('post_schedule').select(COLUMNS).eq('agency_id', user.agency_id)
  const [monthPosts, overduePosts, upcomingPosts, approved, clients] = await Promise.all([
    base().gte('scheduled_at', start).lt('scheduled_at', end).order('scheduled_at'),
    base().is('posted_at', null).lt('scheduled_at', now).order('scheduled_at'),
    base().is('posted_at', null).gte('scheduled_at', now).lt('scheduled_at', week).order('scheduled_at'),
    supabaseAdmin.from('content_items').select('id,client_id,title,type').eq('agency_id', user.agency_id).eq('status', 'client_approved').order('title'),
    accessibleClients(user),
  ])
  check(monthPosts.error); check(overduePosts.error); check(upcomingPosts.error); check(approved.error)
  const names = new Map(clients.map((client) => [client.id, client.name]))
  const [posts, overdue, upcoming] = await Promise.all([
    hydrate(user, monthPosts.data ?? []), hydrate(user, overduePosts.data ?? []), hydrate(user, upcomingPosts.data ?? []),
  ])
  return {
    posts,
    // An archived item never sits in the overdue or upcoming lists.
    overdue: overdue.filter((post) => post.item_status !== 'archived'),
    upcoming: upcoming.filter((post) => post.item_status !== 'archived'),
    schedulable: (approved.data ?? []).filter((item) => names.has(item.client_id))
      .map((item) => ({ id: item.id, title: item.title, type: item.type, client_id: item.client_id, client_name: names.get(item.client_id)! })),
  }
}

/** Unposted posts past their scheduled time, for the admin metric card. */
export async function overdueCount(user: User) {
  const { data, error } = await supabaseAdmin.from('post_schedule').select(COLUMNS).eq('agency_id', user.agency_id)
    .is('posted_at', null).lt('scheduled_at', new Date().toISOString())
  check(error)
  return (await hydrate(user, data ?? [])).filter((post) => post.item_status !== 'archived').length
}

/** Other posts for the same client within an hour of `at`. Advisory only; never blocks scheduling. */
export async function nearbyPosts(user: User, clientId: string, at: string, excludeItemId?: string) {
  const clients = await accessibleClients(user)
  if (!clients.some((client) => client.id === clientId)) return []
  const centre = Date.parse(at)
  const from = new Date(centre - NEARBY_MINUTES * 60e3).toISOString()
  const to = new Date(centre + NEARBY_MINUTES * 60e3).toISOString()
  const { data: items, error } = await supabaseAdmin.from('content_items').select('id,title').eq('client_id', clientId)
  check(error)
  const titles = new Map((items ?? []).map((item) => [item.id, item.title]))
  if (!titles.size) return []
  const { data, error: postError } = await supabaseAdmin.from('post_schedule').select('content_item_id,scheduled_at')
    .eq('agency_id', user.agency_id).in('content_item_id', [...titles.keys()]).gte('scheduled_at', from).lte('scheduled_at', to)
  check(postError)
  return (data ?? []).filter((post) => post.content_item_id !== excludeItemId)
    .map((post) => ({ content_item_id: post.content_item_id, title: titles.get(post.content_item_id) ?? 'Another post', scheduled_at: post.scheduled_at }))
}
