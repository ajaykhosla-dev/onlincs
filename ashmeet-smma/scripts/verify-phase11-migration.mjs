/**
 * Exercises 013_phase11_platform.sql inside one transaction (agency onboarding, suspension, permissions, audit),
 * then ALWAYS rolls back. Run: node --env-file=.env.local scripts/verify-phase11-migration.mjs
 */
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import pg from 'pg'

const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL, ssl: { rejectUnauthorized: false } })
await db.connect()
let began = false
const one = async (sql, params = []) => (await db.query(sql, params)).rows[0]
const rejects = async (sql, params, pattern) => {
  await db.query('savepoint attempt')
  await assert.rejects(db.query(sql, params), pattern)
  await db.query('rollback to savepoint attempt')
}

try {
  await db.query('begin'); began = true
  const platformAgency = `ag-qa-${randomUUID().slice(0, 8)}`
  await db.query(`insert into agencies(id,name,slug,status,plan) values($1,'QA Platform','qa-platform-${randomUUID().slice(0, 6)}','active','internal')`, [platformAgency])
  const owner = `u-qa-owner-${randomUUID().slice(0, 6)}`
  await db.query(`insert into users(id,agency_id,email,full_name,initials,role,avatar_gradient) values($1,$2,$3,'QA Owner','QO','platform_owner','x')`, [owner, platformAgency, `qa-owner-${randomUUID()}@example.com`])

  // Onboarding creates all three records and a log row
  const slug = `qa-agency-${randomUUID().slice(0, 6)}`
  const email = `qa-admin-${randomUUID()}@example.com`
  const created = (await one('select phase11_create_agency($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) r', [owner, 'QA Agency', slug, 'standard', '+91 1', 'Ludhiana', 'reels', 'note', email, 'Priya Sharma'])).r
  const agency = await one('select * from agencies where id=$1', [created.agency_id])
  assert.equal(agency.status, 'trial'); assert.equal(agency.display_name, 'QA Agency'); assert.equal(agency.slug, slug)
  const integrations = await one('select * from agency_integrations where agency_id=$1', [created.agency_id])
  assert.ok(integrations, 'an empty integrations row exists')
  assert.equal(integrations.drive_service_account_key_enc, null); assert.equal(integrations.b2_application_key_enc, null)
  const admin = await one('select * from users where id=$1', [created.user_id])
  assert.equal(admin.role, 'admin'); assert.equal(admin.agency_id, created.agency_id); assert.equal(admin.email, email.toLowerCase()); assert.equal(admin.initials, 'PS'); assert.equal(admin.is_active, true)
  assert.equal((await one(`select count(*)::int n from activity_log where entity_type='platform' and action='agency_created' and agency_id=$1 and actor_id=$2`, [created.agency_id, owner])).n, 1)
  // The new agency is empty and cannot see anyone else's data
  assert.equal((await one('select count(*)::int n from clients where agency_id=$1', [created.agency_id])).n, 0)
  assert.equal((await one('select count(*)::int n from content_items where agency_id=$1', [created.agency_id])).n, 0)

  // Only the platform owner may onboard; duplicates are refused
  const agencyAdmin = (await one(`select id from users where role='admin' and is_active and agency_id <> $1 limit 1`, [created.agency_id])).id
  await rejects('select phase11_create_agency($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [agencyAdmin, 'X', 'x-agency', 'standard', '', '', '', '', 'x@example.com', 'X Y'], /Forbidden/)
  await rejects('select phase11_create_agency($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [owner, 'Dup', slug, 'standard', '', '', '', '', 'dup@example.com', 'D D'], /already taken/)
  await rejects('select phase11_create_agency($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [owner, 'Dup2', 'dup-2', 'standard', '', '', '', '', email, 'D D'], /already belongs/)
  await rejects('select phase11_create_agency($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [owner, 'Bad', 'Bad Slug!', 'standard', '', '', '', '', 'bad@example.com', 'B B'], /lowercase/)

  // Suspension: sign-in gate state changes, nothing is destroyed, reactivation restores it, others are unaffected
  const other = await one(`select id, status from agencies where id='ag-1'`)
  const before = await one('select (select count(*) from users where agency_id=$1) u, (select count(*) from clients where agency_id=$1) c', [other.id])
  await db.query('select phase11_set_agency_status($1,$2,$3,$4)', [owner, created.agency_id, 'suspended', 'Unpaid invoice'])
  const suspended = await one('select status, suspended_at, suspended_reason from agencies where id=$1', [created.agency_id])
  assert.equal(suspended.status, 'suspended'); assert.ok(suspended.suspended_at); assert.equal(suspended.suspended_reason, 'Unpaid invoice')
  assert.equal((await one('select status from agencies where id=$1', [other.id])).status, other.status, 'suspending one agency does not touch another')
  assert.equal((await one('select count(*)::int n from users where agency_id=$1 and is_active', [created.agency_id])).n, 1, 'users and data are untouched')
  assert.deepEqual(await one('select (select count(*) from users where agency_id=$1) u, (select count(*) from clients where agency_id=$1) c', [other.id]), before)
  await db.query('select phase11_set_agency_status($1,$2,$3,$4)', [owner, created.agency_id, 'active', null])
  const reactivated = await one('select status, suspended_at from agencies where id=$1', [created.agency_id])
  assert.equal(reactivated.status, 'active'); assert.equal(reactivated.suspended_at, null)
  assert.equal((await one(`select count(*)::int n from activity_log where entity_type='platform' and agency_id=$1 and action in ('agency_suspended','agency_reactivated')`, [created.agency_id])).n, 2)
  await rejects('select phase11_set_agency_status($1,$2,$3,$4)', [agencyAdmin, created.agency_id, 'suspended', 'x'], /Forbidden/)
  await rejects('select phase11_set_agency_status($1,$2,$3,$4)', [owner, platformAgency, 'suspended', 'x'], /cannot suspend the platform agency/)
  await rejects('select phase11_set_agency_status($1,$2,$3,$4)', [owner, created.agency_id, 'gone', 'x'], /Invalid status/)

  // Support sessions record who, where and how long
  const session = await one('insert into support_sessions(platform_user_id, agency_id, reason) values($1,$2,$3) returning id', [owner, created.agency_id, 'QA'])
  await db.query(`update support_sessions set ended_at = started_at + interval '7 minutes', end_reason='exited' where id=$1`, [session.id])
  assert.equal((await one(`select round(extract(epoch from ended_at - started_at)/60)::int m from support_sessions where id=$1`, [session.id])).m, 7)

  // Credentials stay out of the API's reach
  const grants = await one(`select has_table_privilege('authenticated','agency_integrations','select') a, has_table_privilege('anon','agency_integrations','select') b,
    has_table_privilege('authenticated','support_sessions','select') c, has_function_privilege('authenticated','phase11_create_agency(text,text,text,text,text,text,text,text,text,text)','execute') d`)
  assert.deepEqual(grants, { a: false, b: false, c: false, d: false })
  console.log('Phase 11 rollback check passed: onboarding (3 records + log), permissions, duplicates, suspension and reactivation, isolation of other agencies, support duration, credential privileges.')
} finally {
  if (began) await db.query('rollback')
  await db.end()
}
