import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import pg from 'pg'

const client = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL, ssl: { rejectUnauthorized: false } })
await client.connect()
try {
  await client.query('begin')
  await client.query(await readFile(new URL('../supabase/migrations/006_phase4_shoots.sql', import.meta.url), 'utf8'))
  await client.query("select phase3_set_plan_status('cl-6','2026-09-01','approved','u-4')")
  const input = { client_id: 'cl-6', title: 'Phase 4 rollback shoot', cameraman_id: 'u-7',
    scheduled_start: '2026-10-04T04:30:00Z', scheduled_end: '2026-10-04T06:30:00Z', location: 'Ludhiana' }
  const result = await client.query('select phase4_create_shoot($1::jsonb,$2::text[],$3) as value', [JSON.stringify(input), ['ci-22','ci-23','ci-24'], 'u-4'])
  const id = result.rows[0].value.id
  const links = await client.query('select count(*)::int n from shoot_items where shoot_id=$1', [id])
  assert.equal(links.rows[0].n, 3)
  const statuses = await client.query("select count(*)::int n from content_items where id=any($1::text[]) and status='shoot_scheduled'", [['ci-22','ci-23','ci-24']])
  assert.equal(statuses.rows[0].n, 3)
  const job = await client.query('select status from shoot_folder_jobs where shoot_id=$1', [id])
  assert.equal(job.rows[0].status, 'pending')
  const second = await client.query('select phase4_create_shoot($1::jsonb,$2::text[],$3) as value', [JSON.stringify({ ...input, title: 'Second rollback shoot' }), ['ci-22'], 'u-4'])
  const secondId = second.rows[0].value.id
  const shared = await client.query("select count(*)::int n from shoot_items where content_item_id='ci-22' and shoot_id=any($1::text[])", [[id, secondId]])
  assert.equal(shared.rows[0].n, 2)
  await client.query('savepoint denial')
  await assert.rejects(client.query('select phase4_update_shoot($1,$2::jsonb,$3)', [id, JSON.stringify(input), 'u-2']), /Forbidden/)
  await client.query('rollback to savepoint denial')
  const edited = await client.query('select phase4_update_shoot($1,$2::jsonb,$3) as value', [id, JSON.stringify({ ...input, title: 'Updated rollback shoot' }), 'u-4'])
  assert.equal(edited.rows[0].value.title, 'Updated rollback shoot')
  const editJob = await client.query('select status from shoot_folder_jobs where shoot_id=$1', [id])
  assert.equal(editJob.rows[0].status, 'pending')
  const cancelled = await client.query('select phase4_cancel_shoot($1,$2) as value', [secondId, 'u-4'])
  assert.equal(cancelled.rows[0].value.status, 'cancelled')
  await client.query("select phase4_mark_raw($1,'ci-22','u-7')", [id])
  const partial = await client.query('select status from shoots where id=$1', [id])
  assert.equal(partial.rows[0].status, 'scheduled')
  await client.query("select phase4_mark_raw($1,'ci-23','u-7')", [id])
  await client.query("select phase4_mark_raw($1,'ci-24','u-7')", [id])
  const arrival = await client.query('select status from shoots where id=$1', [id])
  assert.equal(arrival.rows[0].status, 'raw_uploaded')
  const rawStatuses = await client.query("select count(*)::int n from content_items where id=any($1::text[]) and status='raw_uploaded'", [['ci-22','ci-23','ci-24']])
  assert.equal(rawStatuses.rows[0].n, 3)
  console.log('Phase 4 migration passed: scheduling, many-to-many, cross-manager denial, edit/cancel, pending job, status transitions, partial and full arrival')
} finally {
  await client.query('rollback')
  await client.end()
}
