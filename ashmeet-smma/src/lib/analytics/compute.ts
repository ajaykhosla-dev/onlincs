/**
 * Owner analytics: pure functions over the activity trail. No database access here, so every definition is
 * unit-tested and verified against hand-written SQL (scripts/verify-phase9-analytics.ts).
 *
 * Definitions (documented in docs/phase-9-audit.md):
 *  - Scope delivered: items at status "posted" whose planned_date is in the month.
 *  - Throughput: editors = cuts submitted, managers = items moved to posted, cameramen = shoots completed (all in the month).
 *  - Turnaround (medians, hours): editor raw_uploaded -> first cut_submitted; manager cut_submitted -> internally_approved;
 *    client with_client -> client_approved. Medians, never means.
 *  - Revision rate: average number of changes_requested / client_changes events per delivered item.
 *  - On-time rate: posts marked posted in the month at or before their scheduled time.
 *  - First-pass approval: items internally approved in the month that never had changes requested.
 */

export type Event = { entity_id: string; actor_id: string | null; actor_type: string; from_state: string | null; to_state: string; created_at: string }
export type Item = { id: string; client_id: string; type: string; status: string; planned_date: string | null; assigned_editor_id: string | null }
export type Shoot = { id: string; client_id: string; cameraman_id: string | null; status: string; scheduled_start: string }
export type Post = { content_item_id: string; scheduled_at: string; posted_at: string | null; posted_by: string | null }
export type Person = { id: string; full_name: string; role: string }
export type Client = { id: string; name: string; manager_id: string | null; status: string }

export type Inputs = { events: Event[]; items: Item[]; shoots: Shoot[]; posts: Post[]; people: Person[]; clients: Client[] }
export type Filters = { month: string; clientId?: string | null; memberId?: string | null }

export const HOURS = 3600e3
const REVISION_STATES = new Set(['changes_requested', 'client_changes'])
const ms = (value: string) => Date.parse(value)

/** Median (the average of the two middle values for an even count). 0 for no data, never null. */
export function median(values: number[]) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}
const mean = (values: number[]) => values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0
const round = (value: number, places = 1) => Math.round(value * 10 ** places) / 10 ** places

/** UTC bounds of an IST calendar month. */
export function monthRange(month: string) {
  const [year, index] = month.split('-').map(Number)
  const next = index === 12 ? `${year + 1}-01` : `${year}-${String(index + 1).padStart(2, '0')}`
  return { start: ms(`${month}-01T00:00:00+05:30`), end: ms(`${next}-01T00:00:00+05:30`), startDate: `${month}-01`, endDate: `${next}-01` }
}

export type MemberMetrics = {
  user_id: string; name: string; role: string
  throughput: number; delivered: number; revision_rate: number; median_turnaround_hours: number
  turnaround_samples: number; on_time_rate: number; on_time_samples: number; first_pass_rate: number; first_pass_samples: number
}
export type AgencyMetrics = {
  month: string; delivered: number; throughput: number; median_turnaround_hours: number; turnaround_samples: number
  on_time_rate: number; on_time_samples: number; first_pass_rate: number; first_pass_samples: number; revision_rate: number
  clients_turnaround_hours: number
}

type Timeline = Map<string, Event[]>
function timelines(events: Event[]): Timeline {
  const map: Timeline = new Map()
  for (const event of [...events].sort((a, b) => ms(a.created_at) - ms(b.created_at))) {
    const list = map.get(event.entity_id) ?? []; list.push(event); map.set(event.entity_id, list)
  }
  return map
}

/** The latest event into `state` strictly before `before`. */
const lastInto = (events: Event[], state: string, before: number) =>
  [...events].reverse().find((event) => event.to_state === state && ms(event.created_at) <= before)

export function computeMetrics(input: Inputs, filters: Filters) {
  const { start, end, startDate, endDate } = monthRange(filters.month)
  const inMonth = (iso: string) => ms(iso) >= start && ms(iso) < end
  const scoped = new Set(input.items.filter((item) => !filters.clientId || item.client_id === filters.clientId).map((item) => item.id))
  const items = new Map(input.items.filter((item) => scoped.has(item.id)).map((item) => [item.id, item]))
  const byItem = timelines(input.events.filter((event) => scoped.has(event.entity_id)))
  const all = [...byItem.values()].flat()

  const delivered = new Set([...items.values()].filter((item) => item.status === 'posted' && item.planned_date && item.planned_date >= startDate && item.planned_date < endDate).map((item) => item.id))
  const revisions = (itemId: string) => (byItem.get(itemId) ?? []).filter((event) => REVISION_STATES.has(event.to_state)).length

  // Turnaround samples, each attributed to the person who completed the step.
  const editorTurn: { actor: string | null; hours: number }[] = []
  const managerTurn: { actor: string | null; hours: number }[] = []
  const clientTurn: number[] = []
  for (const [itemId, events] of byItem) {
    const firstRaw = events.find((event) => event.to_state === 'raw_uploaded')
    const firstCut = events.find((event) => event.to_state === 'cut_submitted')
    if (firstRaw && firstCut && inMonth(firstCut.created_at) && ms(firstCut.created_at) >= ms(firstRaw.created_at))
      editorTurn.push({ actor: firstCut.actor_id, hours: (ms(firstCut.created_at) - ms(firstRaw.created_at)) / HOURS })
    for (const approval of events.filter((event) => event.to_state === 'internally_approved' && inMonth(event.created_at))) {
      const cut = lastInto(events, 'cut_submitted', ms(approval.created_at))
      if (cut) managerTurn.push({ actor: approval.actor_id, hours: (ms(approval.created_at) - ms(cut.created_at)) / HOURS })
    }
    for (const approval of events.filter((event) => event.to_state === 'client_approved' && inMonth(event.created_at))) {
      const sent = lastInto(events, 'with_client', ms(approval.created_at))
      if (sent) clientTurn.push((ms(approval.created_at) - ms(sent.created_at)) / HOURS)
    }
    void itemId
  }

  const monthEvents = all.filter((event) => inMonth(event.created_at))
  const cuts = monthEvents.filter((event) => event.to_state === 'cut_submitted')
  const postedEvents = monthEvents.filter((event) => event.to_state === 'posted')
  const approvedItems = [...new Set(monthEvents.filter((event) => event.to_state === 'internally_approved').map((event) => event.entity_id))]
  const firstPass = (ids: string[]) => ids.filter((id) => revisions(id) === 0)
  const posts = input.posts.filter((post) => scoped.has(post.content_item_id) && post.posted_at && inMonth(post.posted_at))
  const onTime = (rows: Post[]) => rows.filter((post) => ms(post.posted_at!) <= ms(post.scheduled_at))
  const monthShoots = input.shoots.filter((shoot) => (!filters.clientId || shoot.client_id === filters.clientId) && ms(shoot.scheduled_start) >= start && ms(shoot.scheduled_start) < end
    && (shoot.status === 'completed' || shoot.status === 'raw_uploaded'))

  const pct = (part: number, whole: number) => whole ? round((part / whole) * 100) : 0
  const members: MemberMetrics[] = input.people.map((person) => {
    let throughput = 0, deliveredCount = 0, turn: number[] = [], revisionIds: string[] = [], approvedForPerson: string[] = [], myPosts: Post[] = []
    if (person.role === 'editor') {
      throughput = cuts.filter((event) => event.actor_id === person.id).length
      turn = editorTurn.filter((sample) => sample.actor === person.id).map((sample) => sample.hours)
      revisionIds = [...delivered].filter((id) => items.get(id)?.assigned_editor_id === person.id)
      deliveredCount = revisionIds.length
      approvedForPerson = approvedItems.filter((id) => items.get(id)?.assigned_editor_id === person.id)
    } else if (person.role === 'brand_manager') {
      throughput = postedEvents.filter((event) => event.actor_id === person.id).length
      turn = managerTurn.filter((sample) => sample.actor === person.id).map((sample) => sample.hours)
      const owned = new Set(input.clients.filter((client) => client.manager_id === person.id).map((client) => client.id))
      revisionIds = [...delivered].filter((id) => owned.has(items.get(id)!.client_id))
      deliveredCount = revisionIds.length
      approvedForPerson = approvedItems.filter((id) => owned.has(items.get(id)!.client_id))
      myPosts = posts.filter((post) => post.posted_by === person.id)
    } else if (person.role === 'cameraman') {
      throughput = monthShoots.filter((shoot) => shoot.cameraman_id === person.id).length
      deliveredCount = throughput
    }
    return {
      user_id: person.id, name: person.full_name, role: person.role, throughput, delivered: deliveredCount,
      revision_rate: round(mean(revisionIds.map(revisions)), 2), median_turnaround_hours: round(median(turn)), turnaround_samples: turn.length,
      on_time_rate: pct(onTime(myPosts).length, myPosts.length), on_time_samples: myPosts.length,
      first_pass_rate: pct(firstPass(approvedForPerson).length, approvedForPerson.length), first_pass_samples: approvedForPerson.length,
    }
  }).filter((member) => !filters.memberId || member.user_id === filters.memberId)

  const agency: AgencyMetrics = {
    month: filters.month, delivered: delivered.size, throughput: postedEvents.length,
    median_turnaround_hours: round(median(editorTurn.map((sample) => sample.hours))), turnaround_samples: editorTurn.length,
    on_time_rate: pct(onTime(posts).length, posts.length), on_time_samples: posts.length,
    first_pass_rate: pct(firstPass(approvedItems).length, approvedItems.length), first_pass_samples: approvedItems.length,
    revision_rate: round(mean([...delivered].map(revisions)), 2),
    clients_turnaround_hours: round(median(clientTurn)),
  }
  return { agency, members, samples: { editorTurn, managerTurn, clientTurn } }
}

// ── Scope of work vs delivered ──────────────────────────────────────────────
export type Scope = { client_id: string; month: string; reel_count: number; post_count: number; carousel_count: number; story_count: number }
export type SowStatus = 'complete' | 'onboarding' | 'behind' | 'on_track' | 'no_scope' | 'not_started'
export type SowRow = {
  client_id: string; client_name: string; status: SowStatus
  contracted: number; delivered: number
  byType: Record<'reel' | 'post' | 'carousel' | 'story', { contracted: number; delivered: number }>
  daysLeft: number; expected: number; remaining: number; perDayNeeded: number; summary: string
}
const TYPES = ['reel', 'post', 'carousel', 'story'] as const

/** IST day of month and month length for pace; past months count as fully elapsed, future months as not started. */
export function paceFor(month: string, now = new Date()) {
  const [year, index] = month.split('-').map(Number)
  const daysInMonth = new Date(Date.UTC(year, index, 0)).getUTCDate()
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now)
  const current = today.slice(0, 7)
  if (month < current) return { elapsedDays: daysInMonth, daysInMonth, daysLeft: 0, state: 'past' as const }
  if (month > current) return { elapsedDays: 0, daysInMonth, daysLeft: daysInMonth, state: 'future' as const }
  const day = Number(today.slice(8, 10))
  return { elapsedDays: day, daysInMonth, daysLeft: daysInMonth - day, state: 'current' as const }
}

/** A client is behind when delivery trails the share of the month already gone by more than the tolerance. */
export const BEHIND_TOLERANCE = 0.15

export function computeSow(input: { clients: Client[]; items: Item[]; scopes: Scope[]; month: string; now?: Date }): SowRow[] {
  const { startDate, endDate } = monthRange(input.month)
  const pace = paceFor(input.month, input.now)
  return input.clients.map((client) => {
    const scope = input.scopes.find((row) => row.client_id === client.id && row.month.slice(0, 10) === startDate)
    const posted = input.items.filter((item) => item.client_id === client.id && item.status === 'posted' && item.planned_date && item.planned_date >= startDate && item.planned_date < endDate)
    const byType = Object.fromEntries(TYPES.map((type) => [type, {
      contracted: scope ? scope[`${type}_count` as const] : 0, delivered: posted.filter((item) => item.type === type).length }])) as SowRow['byType']
    const contracted = TYPES.reduce((total, type) => total + byType[type].contracted, 0)
    const delivered = posted.length
    const expected = round(contracted * (pace.elapsedDays / pace.daysInMonth), 1)
    const remaining = Math.max(0, contracted - delivered)
    const perDayNeeded = pace.daysLeft > 0 ? round(remaining / pace.daysLeft, 2) : remaining
    let status: SowStatus
    if (!contracted) status = 'no_scope'
    else if (delivered >= contracted) status = 'complete'
    else if (client.status === 'onboarding' && delivered === 0) status = 'onboarding'
    else if (pace.state === 'future') status = 'not_started'
    else if (delivered / contracted < pace.elapsedDays / pace.daysInMonth - BEHIND_TOLERANCE) status = 'behind'
    else status = 'on_track'
    const left = pace.state === 'current' ? ` with ${pace.daysLeft} ${pace.daysLeft === 1 ? 'day' : 'days'} left` : pace.state === 'past' ? ' (month ended)' : ''
    return { client_id: client.id, client_name: client.name, status, contracted, delivered, byType, daysLeft: pace.daysLeft, expected, remaining, perDayNeeded,
      summary: contracted ? `${delivered} of ${contracted}${left}` : 'No scope set for this month' }
  })
}

export function lastMonths(month: string, count = 6) {
  const [year, index] = month.split('-').map(Number)
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(Date.UTC(year, index - 1 - (count - 1 - i), 1))
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
  })
}
