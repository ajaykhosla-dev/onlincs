import assert from 'node:assert/strict'
import pg from 'pg'

const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL, ssl: { rejectUnauthorized: false } })
await db.connect()
try {
  const table = await db.query(`select relrowsecurity from pg_class where oid='public.media_upload_sessions'::regclass`)
  assert.equal(table.rows[0].relrowsecurity,true)
  const grants = await db.query(`select proname,
    has_function_privilege('service_role',oid,'EXECUTE') service_role,
    has_function_privilege('authenticated',oid,'EXECUTE') authenticated,
    has_function_privilege('anon',oid,'EXECUTE') anon
    from pg_proc where pronamespace='public'::regnamespace
      and proname in ('phase5_assign_editor','phase5_complete_cut','phase5_complete_library') order by proname`)
  assert.equal(grants.rowCount,3)
  for (const row of grants.rows) assert.ok(row.service_role && !row.authenticated && !row.anon,row.proname)
  const counts = await db.query(`select (select count(*)::int from media_upload_sessions) sessions,
    (select count(*)::int from deliverable_versions) versions,
    (select count(*)::int from library_assets) assets`)
  console.log(`Phase 5 live state: RLS on, RPC grants scoped to service_role; ${JSON.stringify(counts.rows[0])}`)
} finally { await db.end() }
