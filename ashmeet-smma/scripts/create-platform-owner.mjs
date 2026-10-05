/**
 * Creates the RapidArc platform owner: the platform agency (home of the owner's user row), the owner user, and the Auth identity.
 * Dry run unless --apply. Sign in with that Google account; the console then walks through two-factor setup.
 *   node --env-file=.env.local scripts/create-platform-owner.mjs you@example.com "Your Name" [--apply]
 */
import { createClient } from '@supabase/supabase-js'
import pg from 'pg'

const [email, ...nameParts] = process.argv.slice(2).filter((arg) => !arg.startsWith('--'))
const name = nameParts.join(' ')
if (!email || !name) { console.error('Usage: create-platform-owner.mjs <email> "<full name>" [--apply]'); process.exit(1) }
if (!process.argv.includes('--apply')) { console.log(`Dry run: would create the RapidArc platform agency (if missing), a platform_owner user for ${email} (${name}) and an Auth identity.`); process.exit(0) }

const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL, ssl: { rejectUnauthorized: false } })
await db.connect()
try {
  await db.query('begin')
  await db.query(`insert into agencies(id, name, slug, status, plan, display_name) values('ag-rapidarc','RapidArc AI','rapidarc','active','internal','RapidArc AI') on conflict (id) do nothing`)
  await db.query(`insert into agency_integrations(agency_id) values('ag-rapidarc') on conflict (agency_id) do nothing`)
  const existing = await db.query('select id, role from users where lower(email) = lower($1)', [email])
  if (existing.rowCount) throw new Error(`${email} already exists as a ${existing.rows[0].role}. Use a different email for the platform owner.`)
  const initials = name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  await db.query(`insert into users(id, agency_id, email, full_name, initials, role, avatar_gradient, is_active) values($1,'ag-rapidarc',$2,$3,$4,'platform_owner','linear-gradient(140deg,#F5A524,#B36B00)',true)`,
    [`u-${Math.random().toString(36).slice(2, 12)}`, email.toLowerCase(), name, initials])
  await db.query('commit')
} catch (error) { await db.query('rollback'); throw error } finally { await db.end() }

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const created = await admin.auth.admin.createUser({ email, email_confirm: true })
if (created.error && !/already|registered/i.test(created.error.message)) throw created.error
console.log(`Platform owner ready: ${email}. Sign in with that Google account at /auth/login; you will be taken to /platform and asked to set up two-factor.`)
