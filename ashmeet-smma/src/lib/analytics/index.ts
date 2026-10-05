import 'server-only'
import { accessibleClients } from '@/lib/phase3/data'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { computeMetrics, computeSow, lastMonths, monthRange, type Client, type Event, type Filters, type Inputs, type Item, type Person, type Post, type Scope, type Shoot, type SowRow } from './compute'
import type { User } from '@/types/database'

const TTL_MS = 15 * 60 * 1000
const cache = new Map<string, { at: number; value: unknown }>()

/** Aggregations do not need to be live: reuse a result for 15 minutes. Pass `fresh` to bypass (exports, verification). */
async function cached<T>(key: string, fresh: boolean | undefined, produce: () => Promise<T>): Promise<T> {
  const hit = cache.get(key)
  if (!fresh && hit && Date.now() - hit.at < TTL_MS) return hit.value as T
  const value = await produce()
  cache.set(key, { at: Date.now(), value })
  return value
}

/** Reads every page, so a growing activity trail is never silently cut at the API's row limit. */
async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from, from + 999)
    if (error) throw new Error(error.message)
    rows.push(...(data ?? []))
    if ((data ?? []).length < 1000) return rows
  }
}

export async function loadInputs(agencyId: string): Promise<Inputs> {
  const [events, items, shoots, posts, people, clients] = await Promise.all([
    fetchAll<Event>((from, to) => supabaseAdmin.from('activity_log').select('entity_id,actor_id,actor_type,from_state,to_state,created_at')
      .eq('agency_id', agencyId).eq('entity_type', 'content_item').not('to_state', 'is', null).order('created_at').range(from, to)),
    fetchAll<Item>((from, to) => supabaseAdmin.from('content_items').select('id,client_id,type,status,planned_date,assigned_editor_id').eq('agency_id', agencyId).order('id').range(from, to)),
    fetchAll<Shoot>((from, to) => supabaseAdmin.from('shoots').select('id,client_id,cameraman_id,status,scheduled_start').eq('agency_id', agencyId).order('id').range(from, to)),
    fetchAll<Post>((from, to) => supabaseAdmin.from('post_schedule').select('content_item_id,scheduled_at,posted_at,posted_by').eq('agency_id', agencyId).order('id').range(from, to)),
    fetchAll<Person>((from, to) => supabaseAdmin.from('users').select('id,full_name,role').eq('agency_id', agencyId).eq('is_active', true).neq('role', 'platform_owner').order('full_name').range(from, to)),
    fetchAll<Client>((from, to) => supabaseAdmin.from('clients').select('id,name,manager_id,status').eq('agency_id', agencyId).order('name').range(from, to)),
  ])
  return { events: events as Event[], items, shoots, posts, people, clients }
}

const ROLE_ORDER = ['admin', 'brand_manager', 'editor', 'cameraman']
export const ROLE_LABEL: Record<string, string> = { admin: 'Admins', brand_manager: 'Brand managers', editor: 'Editors', cameraman: 'Cameramen' }

export type TeamMember = ReturnType<typeof computeMetrics>['members'][number] & {
  clients: { id: string; name: string }[]
  open: { title: string; client: string; status: string; deadline: string | null }[]
  activity: { at: string; text: string }[]
  weekly: number[]
}

/** Team workload and flow for one month, grouped by role (never a single ranked list). */
export async function teamAnalytics(user: User, month: string, filters: Omit<Filters, 'month'> = {}, fresh = false) {
  const key = `team|${user.agency_id}|${month}|${filters.clientId ?? ''}|${filters.memberId ?? ''}`
  return cached(key, fresh, async () => {
    const input = await loadInputs(user.agency_id)
    const { agency, members } = computeMetrics(input, { month, ...filters })
    const itemById = new Map(input.items.map((item) => [item.id, item]))
    const clientById = new Map(input.clients.map((client) => [client.id, client]))
    const titles = new Map<string, string>()
    const { data: titleRows } = await supabaseAdmin.from('content_items').select('id,title,deadline').eq('agency_id', user.agency_id)
    const deadlines = new Map<string, string | null>()
    for (const row of titleRows ?? []) { titles.set(row.id, row.title); deadlines.set(row.id, row.deadline) }
    const { start, end } = monthRange(month)
    const detailed: TeamMember[] = members.map((member) => {
      const mine = input.events.filter((event) => event.actor_id === member.user_id && Date.parse(event.created_at) >= start && Date.parse(event.created_at) < end)
      const weekly = Array.from({ length: 5 }, (_, week) => mine.filter((event) => Math.min(4, Math.floor((Date.parse(event.created_at) - start) / (7 * 864e5))) === week).length)
      const activity = mine.slice(-30).reverse().map((event) => {
        const item = itemById.get(event.entity_id)
        return { at: event.created_at, text: `${(event.to_state).replaceAll('_', ' ')} · ${titles.get(event.entity_id) ?? 'item'}${item ? ` · ${clientById.get(item.client_id)?.name ?? ''}` : ''}` }
      })
      let clientIds: string[] = [], open: TeamMember['open'] = []
      if (member.role === 'brand_manager') {
        const owned = input.clients.filter((client) => client.manager_id === member.user_id)
        clientIds = owned.map((client) => client.id)
        open = input.items.filter((item) => clientIds.includes(item.client_id) && ['cut_submitted', 'internally_approved', 'with_client'].includes(item.status))
          .map((item) => ({ title: titles.get(item.id) ?? item.id, client: clientById.get(item.client_id)?.name ?? '', status: item.status, deadline: deadlines.get(item.id) ?? null }))
      } else if (member.role === 'editor') {
        const work = input.items.filter((item) => item.assigned_editor_id === member.user_id)
        clientIds = [...new Set(work.map((item) => item.client_id))]
        open = work.filter((item) => ['with_editor', 'changes_requested', 'client_changes', 'cut_submitted'].includes(item.status))
          .map((item) => ({ title: titles.get(item.id) ?? item.id, client: clientById.get(item.client_id)?.name ?? '', status: item.status, deadline: deadlines.get(item.id) ?? null }))
      } else if (member.role === 'cameraman') {
        const shoots = input.shoots.filter((shoot) => shoot.cameraman_id === member.user_id)
        clientIds = [...new Set(shoots.map((shoot) => shoot.client_id))]
        open = shoots.filter((shoot) => shoot.status === 'scheduled').map((shoot) => ({ title: `Shoot ${shoot.scheduled_start.slice(0, 10)}`, client: clientById.get(shoot.client_id)?.name ?? '', status: 'scheduled', deadline: null }))
      } else clientIds = input.clients.map((client) => client.id)
      return { ...member, clients: clientIds.map((id) => ({ id, name: clientById.get(id)?.name ?? id })), open, activity, weekly }
    })
    const groups = ROLE_ORDER.map((role) => ({ role, label: ROLE_LABEL[role], members: detailed.filter((member) => member.role === role) })).filter((group) => group.members.length)
    return { agency, groups }
  })
}

export type SowResult = { month: string; rows: (SowRow & { trend: { month: string; delivered: number; contracted: number }[] })[] }

/** Contracted versus delivered per client, with pace flags and a six-month trend. Scoped to the clients this user may see. */
export async function sowAnalytics(user: User, month: string, fresh = false): Promise<SowResult> {
  const clients = await accessibleClients(user)
  const ids = clients.map((client) => client.id)
  const key = `sow|${user.id}|${month}|${ids.join(',')}`
  return cached(key, fresh, async () => {
    if (!ids.length) return { month, rows: [] }
    const months = lastMonths(month, 6)
    const [items, scopes] = await Promise.all([
      fetchAll<Item>((from, to) => supabaseAdmin.from('content_items').select('id,client_id,type,status,planned_date,assigned_editor_id').in('client_id', ids).order('id').range(from, to)),
      fetchAll<Scope>((from, to) => supabaseAdmin.from('client_scope').select('client_id,month,reel_count,post_count,carousel_count,story_count').in('client_id', ids)
        .gte('month', `${months[0]}-01`).lte('month', `${month}-01`).order('month').range(from, to)),
    ])
    const people = clients.map((client) => ({ id: client.id, name: client.name, manager_id: client.manager_id, status: client.status }))
    const rows = computeSow({ clients: people, items, scopes, month })
    const trendRows = months.map((m) => ({ m, rows: computeSow({ clients: people, items, scopes, month: m }) }))
    return { month, rows: rows.map((row) => ({ ...row, trend: trendRows.map(({ m, rows: monthRows }) => {
      const found = monthRows.find((entry) => entry.client_id === row.client_id)!
      return { month: m, delivered: found.delivered, contracted: found.contracted }
    }) })) }
  })
}
