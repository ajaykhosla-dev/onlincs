import assert from 'node:assert/strict'
import pg from 'pg'

const client = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL, ssl: { rejectUnauthorized: false } })
await client.connect()
try {
  const { rows: functions } = await client.query("select proname from pg_proc where proname like 'phase3_%' and pronamespace = 'public'::regnamespace order by proname")
  const { rows: constraints } = await client.query("select pg_get_constraintdef(oid) definition from pg_constraint where conrelid = 'public.monthly_plans'::regclass and conname = 'monthly_plans_status_check'")
  const { rows: counts } = await client.query("select (select count(*)::int from clients where agency_id='ag-1') clients, (select count(*)::int from client_scope where agency_id='ag-1') scopes, (select count(*)::int from content_items where agency_id='ag-1') content_items")
  assert.equal(functions.length, 4)
  assert.equal(constraints.length, 1)
  assert.match(constraints[0].definition, /changes_requested/)
  assert.equal(counts[0].clients, 6)
  console.log({ functions: functions.map((row) => row.proname), counts: counts[0], planConstraint: constraints[0].definition })
} finally {
  await client.end()
}
