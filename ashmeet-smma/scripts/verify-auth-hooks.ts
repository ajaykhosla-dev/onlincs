/** Read-only function checks; dashboard hook configuration still needs separate verification. */
import assert from 'node:assert/strict'
import pg from 'pg'

async function main() {
  if (!process.env.TEST_DATABASE_URL) throw new Error('TEST_DATABASE_URL is required')
  const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await db.connect()
  try {
    const { rows: [person] } = await db.query('select auth_user_id, email, role, agency_id from public.users where id=$1', ['u-1'])
    assert.ok(person?.auth_user_id)
    await db.query('begin read only')
    const privilege = await db.query(`select
      has_schema_privilege('supabase_auth_admin','public','USAGE') schema_usage,
      has_function_privilege('supabase_auth_admin','public.allow_invited_auth_user(jsonb)','EXECUTE') invite_execute,
      has_function_privilege('supabase_auth_admin','public.workspace_access_token(jsonb)','EXECUTE') token_execute`)
    assert.deepEqual(privilege.rows[0], { schema_usage: true, invite_execute: true, token_execute: true })
    const allowed = await db.query('select public.allow_invited_auth_user($1::jsonb) result', [{ user: { email: person.email } }])
    assert.deepEqual(allowed.rows[0].result, {})
    const denied = await db.query('select public.allow_invited_auth_user($1::jsonb) result', [{ user: { email: 'uninvited@example.invalid' } }])
    assert.equal(denied.rows[0].result.error.http_code, 403)
    const claims = await db.query('select public.workspace_access_token($1::jsonb) result', [{ user_id: person.auth_user_id, claims: { sub: person.auth_user_id, role: 'authenticated' } }])
    assert.equal(claims.rows[0].result.claims.agency_id, person.agency_id)
    assert.equal(claims.rows[0].result.claims.workspace_role, person.role)
    assert.equal(claims.rows[0].result.claims.role, 'authenticated')
    console.log('Auth hooks: invited allowed, uninvited denied, workspace claims present')
  } finally {
    await db.query('rollback').catch(() => {})
    await db.end()
  }
}

main().catch(error => { console.error(error); process.exitCode = 1 })
