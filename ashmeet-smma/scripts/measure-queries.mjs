/** Times the heavy list-screen queries against the live database. Run: node --env-file=.env.local scripts/measure-queries.mjs */
import pg from 'pg'
const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL, ssl: { rejectUnauthorized: false } })
await db.connect()
const A = 'ag-1'
const queries = {
  'clients + scope': [`select c.*, (select count(*) from content_items i where i.client_id=c.id and i.status='posted') from clients c where agency_id=$1`],
  'planner month': [`select * from content_items where client_id='cl-1' and planned_date >= '2026-09-01' and planned_date < '2026-10-01'`],
  'den pipeline': [`select i.id,i.status,i.deadline from content_items i where i.agency_id=$1 and i.status in ('cut_submitted','with_editor','changes_requested')`, ],
  'versions by agency': [`select * from deliverable_versions where agency_id=$1 order by version`],
  'activity (analytics)': [`select entity_id,actor_id,from_state,to_state,created_at from activity_log where agency_id=$1 and entity_type='content_item' and to_state is not null order by created_at`],
  'posting month': [`select * from post_schedule where agency_id=$1 and scheduled_at >= '2026-09-01' and scheduled_at < '2026-10-01' order by scheduled_at`],
  'storage raw sum': [`select shoot_id, sum(size_bytes) from raw_files where agency_id=$1 group by 1`],
  'notifications bell': [`select * from notifications where user_id='u-2' order by created_at desc limit 40`],
  'staleness candidates': [`select count(*) from phase8_stale_candidates(now())`],
}
let worst = 0
for (const [name, [sql]] of Object.entries(queries)) {
  const params = sql.includes('$1') ? [A] : []
  await db.query(sql, params) // warm
  const t = performance.now(); await db.query(sql, params); const ms = performance.now() - t
  worst = Math.max(worst, ms)
  console.log(`${name.padEnd(24)} ${ms.toFixed(1)} ms (round trip incl. network)`)
}
const plan = await db.query(`explain analyze select entity_id from activity_log where agency_id='ag-1' and entity_type='content_item' and to_state is not null order by created_at`)
console.log('\nactivity plan execution:', plan.rows.at(-1)['QUERY PLAN'])
console.log(`\nslowest round trip: ${worst.toFixed(1)} ms`)
await db.end()
