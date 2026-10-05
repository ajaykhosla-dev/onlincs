import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeMetrics, computeSow, lastMonths, median, paceFor, type Client, type Event, type Inputs, type Item } from '../src/lib/analytics/compute'

const at = (day: number, hour = 9) => `2026-09-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00+05:30`
const ev = (entity_id: string, to_state: string, created_at: string, actor_id: string | null, from_state: string | null = null): Event =>
  ({ entity_id, actor_id, actor_type: actor_id ? 'user' : 'client', from_state, to_state, created_at })
const people = [{ id: 'ed1', full_name: 'Editor One', role: 'editor' }, { id: 'ed2', full_name: 'Editor Idle', role: 'editor' },
  { id: 'bm1', full_name: 'Manager', role: 'brand_manager' }, { id: 'cam', full_name: 'Camera', role: 'cameraman' }]
const clients: Client[] = [{ id: 'c1', name: 'Alpha', manager_id: 'bm1', status: 'active' }]
const item = (id: string, over: Partial<Item> = {}): Item => ({ id, client_id: 'c1', type: 'reel', status: 'posted', planned_date: '2026-09-10', assigned_editor_id: 'ed1', ...over })

function journey(id: string, rawDay: number, cutHours: number, revisions = 0): Event[] {
  const raw = new Date(at(rawDay)).getTime()
  const out = [ev(id, 'raw_uploaded', new Date(raw).toISOString(), 'bm1'), ev(id, 'cut_submitted', new Date(raw + cutHours * 3600e3).toISOString(), 'ed1')]
  let t = raw + cutHours * 3600e3
  for (let i = 0; i < revisions; i++) { t += 3600e3; out.push(ev(id, 'changes_requested', new Date(t).toISOString(), 'bm1')) }
  out.push(ev(id, 'internally_approved', new Date(t + 2 * 3600e3).toISOString(), 'bm1'))
  out.push(ev(id, 'with_client', new Date(t + 3 * 3600e3).toISOString(), 'bm1'))
  out.push(ev(id, 'client_approved', new Date(t + 27 * 3600e3).toISOString(), null))
  out.push(ev(id, 'posted', new Date(t + 30 * 3600e3).toISOString(), 'bm1'))
  return out
}
const base = (events: Event[], items: Item[], extra: Partial<Inputs> = {}): Inputs => ({ events, items, shoots: [], posts: [], people, clients, ...extra })

test('median is the middle value, and 0 (not null) with no data', () => {
  assert.equal(median([]), 0); assert.equal(median([5]), 5); assert.equal(median([1, 9, 3]), 3); assert.equal(median([2, 4, 6, 100]), 5)
})

test('one extreme outlier barely moves a median turnaround', () => {
  const ids = ['a', 'b', 'c', 'd', 'e']
  const typical = ids.flatMap((id, i) => journey(id, 2 + i, 20 + i))
  const before = computeMetrics(base(typical, ids.map((id) => item(id))), { month: '2026-09' }).members.find((m) => m.user_id === 'ed1')!
  const withOutlier = [...typical, ...journey('z', 1, 200)]
  const after = computeMetrics(base(withOutlier, [...ids, 'z'].map((id) => item(id))), { month: '2026-09' }).members.find((m) => m.user_id === 'ed1')!
  assert.equal(before.median_turnaround_hours, 22)
  assert.ok(after.median_turnaround_hours - before.median_turnaround_hours <= 1.5, `moved ${after.median_turnaround_hours - before.median_turnaround_hours}h`)
  assert.equal(before.turnaround_samples, 5); assert.equal(after.turnaround_samples, 6)
})

test('throughput, revision rate and first-pass approval per editor', () => {
  const events = [...journey('a', 2, 10, 0), ...journey('b', 3, 12, 2)]
  const result = computeMetrics(base(events, [item('a'), item('b')]), { month: '2026-09' })
  const editor = result.members.find((m) => m.user_id === 'ed1')!
  assert.equal(editor.throughput, 2)
  assert.equal(editor.delivered, 2)
  assert.equal(editor.revision_rate, 1, '(0 + 2) revisions over 2 delivered items')
  assert.equal(editor.first_pass_rate, 50); assert.equal(editor.first_pass_samples, 2)
  assert.equal(result.agency.delivered, 2)
  assert.equal(result.agency.clients_turnaround_hours, 24)
})

test('a member with no activity returns zeros, not nulls or errors', () => {
  const idle = computeMetrics(base(journey('a', 2, 10), [item('a')]), { month: '2026-09' }).members.find((m) => m.user_id === 'ed2')!
  for (const [key, value] of Object.entries(idle)) if (typeof value === 'number') assert.equal(value, 0, key)
  const empty = computeMetrics(base([], []), { month: '2026-09' })
  assert.equal(empty.agency.delivered, 0); assert.equal(empty.agency.median_turnaround_hours, 0); assert.equal(empty.agency.on_time_rate, 0)
})

test('filters narrow by month, client and member', () => {
  const events = [...journey('a', 2, 10), ...journey('b', 3, 12)]
  const items = [item('a'), item('b', { client_id: 'c2' })]
  assert.equal(computeMetrics(base(events, items), { month: '2026-09', clientId: 'c1' }).agency.throughput, 1)
  assert.equal(computeMetrics(base(events, items), { month: '2026-09' }).agency.throughput, 2)
  assert.equal(computeMetrics(base(events, items), { month: '2026-10' }).agency.throughput, 0, 'a different month sees none of it')
  assert.deepEqual(computeMetrics(base(events, items), { month: '2026-09', memberId: 'ed1' }).members.map((m) => m.user_id), ['ed1'])
})

test('on-time rate counts posts marked at or before their scheduled time', () => {
  const posts = [
    { content_item_id: 'a', scheduled_at: at(10, 12), posted_at: at(10, 11), posted_by: 'bm1' },
    { content_item_id: 'b', scheduled_at: at(10, 12), posted_at: at(11, 9), posted_by: 'bm1' },
  ]
  const result = computeMetrics(base([], [item('a'), item('b')], { posts }), { month: '2026-09' })
  assert.equal(result.agency.on_time_rate, 50); assert.equal(result.members.find((m) => m.user_id === 'bm1')!.on_time_samples, 2)
})

test('scope of work: pace flags a client behind, complete and onboarding are distinct', () => {
  const scopes = [
    { client_id: 'sandhu', month: '2026-09-01', reel_count: 8, post_count: 4, carousel_count: 2, story_count: 2 },
    { client_id: 'grover', month: '2026-09-01', reel_count: 10, post_count: 6, carousel_count: 2, story_count: 2 },
    { client_id: 'verdant', month: '2026-09-01', reel_count: 6, post_count: 2, carousel_count: 1, story_count: 1 },
  ]
  const cs: Client[] = [{ id: 'sandhu', name: 'Sandhu Interiors', manager_id: null, status: 'active' }, { id: 'grover', name: 'Grover Motors', manager_id: null, status: 'active' },
    { id: 'verdant', name: 'Verdant Gym', manager_id: null, status: 'onboarding' }]
  const posted = (client: string, n: number, type = 'reel'): Item[] => Array.from({ length: n }, (_, i) => ({ id: `${client}${i}${type}`, client_id: client, type, status: 'posted', planned_date: '2026-09-12', assigned_editor_id: null }))
  const items = [...posted('sandhu', 6), ...posted('grover', 20)]
  const rows = computeSow({ clients: cs, items, scopes, month: '2026-09', now: new Date('2026-09-23T10:00:00+05:30') })
  const by = Object.fromEntries(rows.map((r) => [r.client_name, r]))
  assert.equal(by['Sandhu Interiors'].status, 'behind'); assert.equal(by['Sandhu Interiors'].summary, '6 of 16 with 7 days left')
  assert.equal(by['Grover Motors'].status, 'complete')
  assert.equal(by['Verdant Gym'].status, 'onboarding')
  assert.equal(Object.values(by['Sandhu Interiors'].byType).reduce((t, v) => t + v.contracted, 0), by['Sandhu Interiors'].contracted, 'the breakdown sums to the total')
  assert.equal(by['Sandhu Interiors'].byType.reel.delivered, 6)
})

test('pace: past months are fully elapsed, future months have not started', () => {
  const now = new Date('2026-10-05T10:00:00+05:30')
  assert.equal(paceFor('2026-09', now).state, 'past'); assert.equal(paceFor('2026-11', now).state, 'future')
  assert.deepEqual([paceFor('2026-10', now).elapsedDays, paceFor('2026-10', now).daysLeft], [5, 26])
  assert.deepEqual(lastMonths('2026-10', 6), ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'])
})
