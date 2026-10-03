import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import pg from 'pg'

const url = process.env.TEST_DATABASE_URL
if (!url) throw new Error('TEST_DATABASE_URL is required')
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
await client.connect()
try {
  await client.query('begin')
  const sql = await readFile(new URL('../supabase/migrations/005_phase3.sql', import.meta.url), 'utf8')
  await client.query(sql)
  const { rows } = await client.query("select proname from pg_proc where proname like 'phase3_%' order by proname")
  console.log('Validated functions:', rows.map((row) => row.proname).join(', '))
  const { rows: counts } = await client.query("select manager_id, count(*)::int n from clients where agency_id = 'ag-1' group by manager_id order by manager_id")
  assert.equal(counts.reduce((sum, row) => sum + row.n, 0), 6)
  assert.equal(counts.find((row) => row.manager_id === 'u-2')?.n, 2)
  console.log('Seed clients and manager scope verified')

  await client.query('savepoint phase3_invalid')
  await assert.rejects(client.query("select phase3_transition('ci-13','posted','u-3','planned')"), /planned to posted/)
  await client.query('rollback to savepoint phase3_invalid')
  await client.query('savepoint phase3_forbidden')
  await assert.rejects(client.query("select phase3_transition('ci-4','internally_approved','u-5','cut_submitted')"), /Forbidden/)
  await client.query('rollback to savepoint phase3_forbidden')
  const before = await client.query("select count(*)::int n from activity_log where entity_id = 'ci-13' and action = 'content_status_changed'")
  await client.query("select phase3_transition('ci-13','calendar_approved','u-3','planned')")
  const after = await client.query("select status from content_items where id = 'ci-13'")
  const logs = await client.query("select count(*)::int n from activity_log where entity_id = 'ci-13' and action = 'content_status_changed'")
  assert.equal(after.rows[0].status, 'calendar_approved')
  assert.equal(logs.rows[0].n, before.rows[0].n + 1)
  console.log('Transition validity, role denial and one activity log verified')

  await client.query('savepoint phase3_forced_failure')
  await client.query("create function phase3_fail_log() returns trigger language plpgsql as $$ begin raise exception 'forced log failure'; end $$")
  await client.query("create trigger phase3_fail_log before insert on activity_log for each row execute function phase3_fail_log()")
  await client.query('savepoint phase3_before_transition')
  await assert.rejects(client.query("select phase3_transition('ci-13','with_editor','u-3','calendar_approved')"), /forced log failure/)
  await client.query('rollback to savepoint phase3_before_transition')
  const unchanged = await client.query("select status from content_items where id = 'ci-13'")
  assert.equal(unchanged.rows[0].status, 'calendar_approved')
  await client.query('rollback to savepoint phase3_forced_failure')
  console.log('Forced logging failure rolled back the item status')

  const clientInput = { code: `P3-${Date.now()}`, name: 'Phase 3 rollback check', handle: '@phase3.check', niche: 'Test', manager_id: 'u-2', status: 'onboarding' }
  const scopeInput = { reel_count: 2, post_count: 1, carousel_count: 1, story_count: 0 }
  const created = await client.query('select phase3_save_client(null,$1::jsonb,$2::jsonb,$3) as value', [JSON.stringify(clientInput), JSON.stringify(scopeInput), 'u-1'])
  const newClient = created.rows[0].value
  const scope = await client.query('select * from client_scope where client_id=$1', [newClient.id])
  assert.equal(scope.rows.length, 1)
  assert.equal(scope.rows[0].reel_count, 2)
  const clientLog = await client.query("select count(*)::int n from activity_log where entity_id=$1 and action='created'", [newClient.id])
  assert.equal(clientLog.rows[0].n, 1)
  clientInput.manager_id = 'u-3'
  await client.query('select phase3_save_client($1,$2::jsonb,$3::jsonb,$4)', [newClient.id, JSON.stringify(clientInput), '{}', 'u-1'])
  const assigned = await client.query('select manager_id from clients where id=$1', [newClient.id])
  assert.equal(assigned.rows[0].manager_id, 'u-3')
  const reassignedLog = await client.query("select count(*)::int n from activity_log where entity_id=$1 and action='reassigned'", [newClient.id])
  assert.equal(reassignedLog.rows[0].n, 1)
  await client.query('savepoint phase3_other_manager')
  await assert.rejects(client.query('select phase3_save_content(null,$1,$2::jsonb,$3)', [newClient.id, JSON.stringify({ title: 'Blocked', type: 'reel' }), 'u-2']), /Forbidden/)
  await client.query('rollback to savepoint phase3_other_manager')
  const contentInput = { title: 'Complete idea', type: 'reel', concept: 'Concept', script: 'Script', instructions_editor: 'Cut it', instructions_cameraman: 'Film it', reference_links: ['https://example.com/reference'], planned_date: '2026-09-25', planned_time: '10:00', assigned_editor_id: 'u-5', deadline: '2026-09-28' }
  const item = await client.query('select phase3_save_content(null,$1,$2::jsonb,$3) as value', [newClient.id, JSON.stringify(contentInput), 'u-3'])
  assert.equal(item.rows[0].value.status, 'planned')
  assert.deepEqual(item.rows[0].value.reference_links, contentInput.reference_links)
  const itemLog = await client.query("select count(*)::int n from activity_log where entity_id=$1 and action='created'", [item.rows[0].value.id])
  assert.equal(itemLog.rows[0].n, 1)
  console.log('Client creation, scope, reassign, scoped content creation and logs verified')

  const planned = await client.query("select count(*)::int n from content_items where client_id='cl-6' and planned_date between '2026-09-01' and '2026-09-30' and status='planned'")
  assert.equal(planned.rows[0].n, 3)
  await client.query('savepoint phase3_before_bulk')
  await client.query("select phase3_set_plan_status('cl-6','2026-09-01','approved','u-4')")
  const approved = await client.query("select count(*)::int n from content_items where client_id='cl-6' and planned_date between '2026-09-01' and '2026-09-30' and status='calendar_approved'")
  assert.equal(approved.rows[0].n, 3)
  console.log('Monthly approval transitioned all planned items')
  await client.query('rollback to savepoint phase3_before_bulk')
  await client.query("create function phase3_fail_bulk() returns trigger language plpgsql as $$ begin if new.entity_id = 'ci-23' then raise exception 'forced bulk failure'; end if; return new; end $$")
  await client.query('create trigger phase3_fail_bulk before insert on activity_log for each row execute function phase3_fail_bulk()')
  await client.query('savepoint phase3_bulk_failure')
  await assert.rejects(client.query("select phase3_set_plan_status('cl-6','2026-09-01','approved','u-4')"), /forced bulk failure/)
  await client.query('rollback to savepoint phase3_bulk_failure')
  const stillPlanned = await client.query("select count(*)::int n from content_items where client_id='cl-6' and planned_date between '2026-09-01' and '2026-09-30' and status='planned'")
  assert.equal(stillPlanned.rows[0].n, 3)
  console.log('Forced bulk failure left all three items planned')
} finally {
  await client.query('rollback')
  await client.end()
}

