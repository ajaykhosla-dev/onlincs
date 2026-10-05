/**
 * Verifies every analytics metric against an independently written SQL query on the live data, and times the
 * aggregation. Run: npm run verify:analytics   (tsx --conditions=react-server --env-file=.env.local)
 */
import assert from 'node:assert/strict'
import pg from 'pg'
import { computeMetrics, computeSow } from '../src/lib/analytics/compute'
import { loadInputs } from '../src/lib/analytics'

async function main() {
  const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await db.connect()
  const agency = process.argv[2] ?? 'ag-1'
  const months = (process.argv[3] ?? '2026-09,2026-10').split(',')
  const rows = async (sql: string, params: unknown[] = []) => (await db.query(sql, params)).rows
  let checks = 0
  const same = (actual: unknown, expected: unknown, label: string) => { assert.deepEqual(actual, expected, label); checks++ }

  const started = Date.now()
  const input = await loadInputs(agency)
  for (const month of months) {
    const t0 = Date.now()
    const { agency: summary, members } = computeMetrics(input, { month })
    const elapsed = Date.now() - t0
    assert.ok(elapsed < 500, `aggregation took ${elapsed}ms`)
    const [yy, mm] = month.split('-').map(Number)
    const nextMonth = mm === 12 ? `${yy + 1}-01` : `${yy}-${String(mm + 1).padStart(2, '0')}`
    const bounds = `tstzrange('${month}-01T00:00:00+05:30'::timestamptz, '${nextMonth}-01T00:00:00+05:30'::timestamptz)`
    const planned = `date '${month}-01'`

    // Scope delivered per client
    const sow = computeSow({ clients: input.clients, items: input.items, month, scopes: (await rows(`select client_id, month::text, reel_count, post_count, carousel_count, story_count from client_scope where agency_id=$1`, [agency])) as never })
    const sqlDelivered = await rows(`select client_id, count(*)::int n from content_items where agency_id=$1 and status='posted' and planned_date >= ${planned} and planned_date < ${planned} + interval '1 month' group by 1`, [agency])
    for (const row of sow) same(row.delivered, sqlDelivered.find((r) => r.client_id === row.client_id)?.n ?? 0, `${month} delivered ${row.client_name}`)
    same(summary.delivered, sqlDelivered.reduce((total, r) => total + r.n, 0), `${month} agency delivered`)

    // Editors: throughput (cuts) and median raw_uploaded -> first cut_submitted, attributed to the cut's actor
    const turn = await rows(`
      with raw as (select entity_id, min(created_at) t from activity_log where agency_id=$1 and entity_type='content_item' and to_state='raw_uploaded' group by 1),
           cut as (select distinct on (entity_id) entity_id, actor_id, created_at t from activity_log where agency_id=$1 and entity_type='content_item' and to_state='cut_submitted' order by entity_id, created_at)
      select cut.actor_id, count(*)::int n, coalesce(round((percentile_cont(0.5) within group (order by extract(epoch from cut.t - raw.t)/3600))::numeric, 1), 0)::float med
        from cut join raw using (entity_id)
       where ${bounds} @> cut.t and cut.t >= raw.t group by 1`, [agency])
    const throughput = await rows(`select actor_id, count(*)::int n from activity_log where agency_id=$1 and entity_type='content_item' and to_state='cut_submitted' and ${bounds} @> created_at group by 1`, [agency])
    for (const member of members.filter((m) => m.role === 'editor')) {
      same(member.throughput, throughput.find((r) => r.actor_id === member.user_id)?.n ?? 0, `${month} cuts ${member.name}`)
      const sample = turn.find((r) => r.actor_id === member.user_id)
      same([member.median_turnaround_hours, member.turnaround_samples], [sample?.med ?? 0, sample?.n ?? 0], `${month} editor turnaround ${member.name}`)
    }

    // Managers: items shipped to posted, and median cut_submitted -> internally_approved
    const posted = await rows(`select actor_id, count(*)::int n from activity_log where agency_id=$1 and entity_type='content_item' and to_state='posted' and ${bounds} @> created_at group by 1`, [agency])
    const mgrTurn = await rows(`
      select a.actor_id, count(*)::int n, coalesce(round((percentile_cont(0.5) within group (order by extract(epoch from a.created_at - c.t)/3600))::numeric, 1), 0)::float med
        from activity_log a
        cross join lateral (select max(created_at) t from activity_log b where b.agency_id=a.agency_id and b.entity_id=a.entity_id and b.entity_type='content_item' and b.to_state='cut_submitted' and b.created_at <= a.created_at) c
       where a.agency_id=$1 and a.entity_type='content_item' and a.to_state='internally_approved' and ${bounds} @> a.created_at and c.t is not null group by 1`, [agency])
    for (const member of members.filter((m) => m.role === 'brand_manager')) {
      same(member.throughput, posted.find((r) => r.actor_id === member.user_id)?.n ?? 0, `${month} posted ${member.name}`)
      const sample = mgrTurn.find((r) => r.actor_id === member.user_id)
      same([member.median_turnaround_hours, member.turnaround_samples], [sample?.med ?? 0, sample?.n ?? 0], `${month} manager turnaround ${member.name}`)
    }

    // Clients: median with_client -> client_approved
    const [clientTurn] = await rows(`
      select coalesce(round((percentile_cont(0.5) within group (order by extract(epoch from a.created_at - c.t)/3600))::numeric, 1), 0)::float med
        from activity_log a
        cross join lateral (select max(created_at) t from activity_log b where b.agency_id=a.agency_id and b.entity_id=a.entity_id and b.entity_type='content_item' and b.to_state='with_client' and b.created_at <= a.created_at) c
       where a.agency_id=$1 and a.entity_type='content_item' and a.to_state='client_approved' and ${bounds} @> a.created_at and c.t is not null`, [agency])
    same(summary.clients_turnaround_hours, clientTurn.med, `${month} client turnaround`)

    // On-time rate, first-pass approval, revision rate
    const [onTime] = await rows(`select count(*)::int n, count(*) filter (where posted_at <= scheduled_at)::int ok from post_schedule where agency_id=$1 and posted_at is not null and ${bounds} @> posted_at`, [agency])
    same([summary.on_time_samples, summary.on_time_rate], [onTime.n, onTime.n ? Math.round((onTime.ok / onTime.n) * 1000) / 10 : 0], `${month} on-time`)
    const [firstPass] = await rows(`
      with approved as (select distinct entity_id from activity_log where agency_id=$1 and entity_type='content_item' and to_state='internally_approved' and ${bounds} @> created_at)
      select count(*)::int n, count(*) filter (where not exists (select 1 from activity_log r where r.entity_id=approved.entity_id and r.entity_type='content_item' and r.to_state in ('changes_requested','client_changes')))::int ok from approved`, [agency])
    same([summary.first_pass_samples, summary.first_pass_rate], [firstPass.n, firstPass.n ? Math.round((firstPass.ok / firstPass.n) * 1000) / 10 : 0], `${month} first pass`)
    const [revision] = await rows(`
      select coalesce(round(avg(rev)::numeric, 2), 0)::float r from (
        select (select count(*) from activity_log r where r.entity_id=i.id and r.entity_type='content_item' and r.to_state in ('changes_requested','client_changes'))::int rev
          from content_items i where i.agency_id=$1 and i.status='posted' and i.planned_date >= ${planned} and i.planned_date < ${planned} + interval '1 month') x`, [agency])
    same(summary.revision_rate, revision.r, `${month} revision rate`)
  }
  console.log(`Phase 9 analytics verified against independent SQL: ${checks} comparisons across ${months.join(', ')} for ${agency}; load+compute ${Date.now() - started}ms`)
  await db.end()
}
main().catch((error) => { console.error(error); process.exit(1) })
