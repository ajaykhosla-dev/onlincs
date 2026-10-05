/** Temporary live HTTP checks for Phases 8–11. Dry-run by default; --apply cleans up all QA rows. */
import assert from 'node:assert/strict'
import { createHmac, randomBytes, randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { rm } from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

const apply = process.argv.includes('--apply')
const base = (process.env.QA_BASE_URL || process.env.NEXT_PUBLIC_APP_URL).replace(/\/$/, '')
const tag = `qa-p811-${randomUUID().slice(0, 8)}`
const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL, ssl: { rejectUnauthorized: false } })
const adminApi = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } })
const platformAgency = `${tag}-agency`
const people = [
  { id: `${tag}-admin`, email: `${tag}-admin@example.invalid`, role: 'admin', agency: 'ag-1' },
  { id: `${tag}-owner`, email: `${tag}-owner@example.invalid`, role: 'platform_owner', agency: platformAgency },
].map((p) => ({ ...p, password: randomBytes(32).toString('base64url'), authId: null, inserted: false, jar: new Map(), client: null }))
const [workspaceAdmin, owner] = people
const noteId = `${tag}-notification`
let agencyInserted = false
let browser, browserSocket, browserCommand
const workspace = path.resolve(process.cwd())
const profile = path.resolve(workspace, `.qa-p811-edge-${tag}`)
assert.ok(profile.startsWith(`${workspace}${path.sep}`))
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const checked = (result, label) => { if (result.error) throw new Error(`${label}: ${result.error.message}`); return result.data }
const one = async (sql, args = []) => (await db.query(sql, args)).rows[0]
const step = (label) => console.log(`PASS ${label}`)

async function signIn(person) {
  person.client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: { getAll: () => [...person.jar].map(([name, value]) => ({ name, value })),
      setAll: (items) => items.forEach(({ name, value }) => person.jar.set(name, value)) },
  })
  const result = checked(await person.client.auth.signInWithPassword({ email: person.email, password: person.password }), 'QA sign-in')
  const claims = JSON.parse(Buffer.from(result.session.access_token.split('.')[1], 'base64url').toString())
  assert.equal(claims.workspace_role, person.role)
}
async function call(path, { actor, method = 'GET', body, headers = {} } = {}) {
  const cookie = actor ? [...actor.jar].map(([name, value]) => `${name}=${encodeURIComponent(value)}`).join('; ') : ''
  const response = await fetch(`${base}${path}`, { method, redirect: 'manual', signal: AbortSignal.timeout(60000),
    headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined })
  const type = response.headers.get('content-type') ?? ''
  const payload = type.includes('json') ? await response.json() : type.includes('text/csv')
    ? Buffer.from(await response.arrayBuffer()) : await response.text()
  return { status: response.status, payload, headers: response.headers }
}
function expect(result, status, label) {
  assert.equal(result.status, status, `${label}: HTTP ${result.status}, ${typeof result.payload === 'string' ? result.payload.slice(0, 120) : result.payload?.message ?? ''}`)
  return result.payload
}
function totp(secret) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = 0, value = 0, bytes = []
  for (const c of secret.replace(/=+$/, '').toUpperCase()) {
    value = (value << 5) | alphabet.indexOf(c); bits += 5
    if (bits >= 8) { bytes.push((value >>> (bits - 8)) & 255); bits -= 8 }
  }
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)))
  const hash = createHmac('sha1', Buffer.from(bytes)).update(counter).digest()
  const offset = hash[hash.length - 1] & 15
  return String((hash.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, '0')
}
async function cleanup() {
  const errors = []
  const attempt = async (label, work) => { try { await work() } catch (error) { errors.push(`${label}: ${error.message}`) } }
  browserSocket?.close(); browser?.kill()
  if (browser) await attempt('Edge profile', async () => {
    for (let retry = 0; retry < 10; retry++) {
      try { await rm(profile, { recursive: true, force: true }); return }
      catch (error) { if (error.code !== 'EBUSY' || retry === 9) throw error; await sleep(500) }
    }
  })
  await attempt('notification data', async () => {
    await db.query('delete from notifications where id=$1', [noteId])
    await db.query('delete from notification_prefs where user_id=$1', [workspaceAdmin.id])
    await db.query('delete from activity_log where actor_id = any($1::text[])', [people.map((person) => person.id)])
  })
  for (const person of people) if (person.authId) await attempt(`${person.role} Auth`, async () => checked(await adminApi.auth.admin.deleteUser(person.authId), 'QA Auth deletion'))
  for (const person of people) if (person.inserted) await attempt(`${person.role} user`, async () => { await db.query('delete from users where id=$1', [person.id]) })
  if (agencyInserted) await attempt('platform agency', async () => { await db.query('delete from agencies where id=$1', [platformAgency]) })
  if (errors.length) throw new Error(`QA cleanup incomplete: ${errors.join(' | ')}`)
  console.log('QA cleanup complete: temporary Auth identities and database rows removed.')
}

async function startBrowser() {
  const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  const port = 9900 + Math.floor(Math.random() * 500)
  browser = spawn(edge, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' })
  let endpoint
  for (let attempt = 0; attempt < 60; attempt++) {
    try { const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); endpoint = pages.find((p) => p.type === 'page')?.webSocketDebuggerUrl }
    catch { /* Edge is starting. */ }
    if (endpoint) break
    await sleep(250)
  }
  assert.ok(endpoint, 'Edge remote debugger did not start')
  browserSocket = new WebSocket(endpoint)
  await new Promise((resolve, reject) => { browserSocket.addEventListener('open', resolve, { once: true }); browserSocket.addEventListener('error', reject, { once: true }) })
  let nextId = 0
  const pending = new Map()
  browserSocket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (!message.id || !pending.has(message.id)) return
    const waiter = pending.get(message.id); pending.delete(message.id)
    if (message.error) waiter.reject(new Error(message.error.message)); else waiter.resolve(message.result)
  })
  browserCommand = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId; pending.set(id, { resolve, reject }); browserSocket.send(JSON.stringify({ id, method, params }))
  })
  await browserCommand('Page.enable'); await browserCommand('Network.enable'); await browserCommand('Runtime.enable')
  await browserCommand('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false })
}
async function evaluate(expression) {
  const result = await browserCommand('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
  return result.result.value
}
async function visit(pathname, text) {
  await browserCommand('Page.navigate', { url: `${base}${pathname}` })
  for (let attempt = 0; attempt < 60; attempt++) {
    if (await evaluate(`document.body?.innerText?.includes(${JSON.stringify(text)}) ?? false`).catch(() => false)) return
    await sleep(500)
  }
  throw new Error(`Browser did not show ${text}; URL=${await evaluate('location.href')}`)
}
async function browserCookies(person) {
  for (const [name, value] of person.jar) await browserCommand('Network.setCookie', { name, value: encodeURIComponent(value), url: base })
}

await db.connect()
try {
  const existing = await one(`select count(*)::int n from agencies where id='ag-1'`)
  assert.equal(existing.n, 1)
  console.log(`Phase 8–11 HTTP QA preflight: base=${base}, temporary prefix=${tag}`)
  if (!apply) console.log('Read-only preflight complete. Pass --apply for temporary live checks.')
  else {
    await db.query(`insert into agencies(id,name,slug,status,plan) values($1,'QA Platform', $1,'active','internal')`, [platformAgency]); agencyInserted = true
    for (const person of people) {
      await db.query(`insert into users(id,agency_id,email,full_name,initials,role,avatar_gradient,is_active)
        values($1,$2,$3,$4,'QA',$5,'linear-gradient(140deg,#8F80F7,#5A4AD8)',true)`,
      [person.id, person.agency, person.email, `QA ${person.role}`, person.role]); person.inserted = true
      person.authId = checked(await adminApi.auth.admin.createUser({ email: person.email, password: person.password, email_confirm: true }), 'QA Auth creation').user.id
      await signIn(person)
    }
    step('temporary agency admin and platform owner authenticated with correct role claims')
    await runChecks()
  }
} finally { try { if (apply) await cleanup() } finally { await db.end() } }

async function runChecks() {
  // Phase 8: notification bell API and per-user preferences.
  expect(await call('/api/notifications'), 401, 'Anonymous notifications')
  await db.query(`insert into notifications(id,agency_id,user_id,type,title,body,link)
    values($1,'ag-1',$2,'edit_assigned','QA notification','QA item assigned','/admin/clients')`, [noteId, workspaceAdmin.id])
  const inbox = expect(await call('/api/notifications', { actor: workspaceAdmin }), 200, 'Notification bell')
  assert.equal(inbox.unread, 1); assert.ok(inbox.items.some((n) => n.id === noteId))
  const prefs = expect(await call('/api/notification-prefs', { actor: workspaceAdmin }), 200, 'Default notification preferences').prefs
  const changed = { ...prefs, quiet_enabled: true, quiet_start: '21:30', quiet_end: '07:30' }
  expect(await call('/api/notification-prefs', { actor: workspaceAdmin, method: 'PUT', body: changed }), 200, 'Update notification preferences')
  assert.equal(expect(await call('/api/notification-prefs', { actor: workspaceAdmin }), 200, 'Read preferences').prefs.quiet_start, '21:30')
  expect(await call('/api/notifications/read', { actor: workspaceAdmin, method: 'POST', body: { ids: [noteId] } }), 200, 'Mark notification read')
  assert.equal(expect(await call('/api/notifications', { actor: workspaceAdmin }), 200, 'Unread after mark').unread, 0)
  expect(await call('/api/cron/staleness'), 401, 'Cron secret required')
  step('Phase 8 bell, unread count, read action, preferences, and cron guard')

  // Phase 9: live analytics screens and role-scoped exports.
  for (const route of ['/admin/team', '/admin/scope', '/admin/clients']) {
    const page = await call(route, { actor: workspaceAdmin }); assert.equal(page.status, 200, route)
  }
  const csv = await call('/api/export?view=clients', { actor: workspaceAdmin })
  assert.equal(csv.status, 200, 'Client CSV export')
  assert.ok(csv.headers.get('content-type')?.includes('text/csv'))
  assert.ok(Buffer.isBuffer(csv.payload) && csv.payload.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])), 'CSV starts with BOM')
  step('Phase 9 live team, scope, clients screens and CSV export')

  // Phase 10: PWA assets, storage access, deletion guard, and Drive comparison.
  const manifest = expect(await call('/manifest.webmanifest'), 200, 'PWA manifest')
  assert.equal(manifest.display, 'standalone'); assert.ok(manifest.icons.some((icon) => icon.sizes === '512x512'))
  const sw = expect(await call('/sw.js'), 200, 'Service worker')
  assert.match(sw, /addEventListener\(['"]push/); assert.match(sw, /addEventListener\(['"]fetch/)
  const storage = expect(await call('/api/storage', { actor: workspaceAdmin }), 200, 'Admin storage')
  assert.equal(storage.canDelete, true)
  expect(await call('/api/storage/delete', { actor: workspaceAdmin, method: 'POST',
    body: { shootIds: ['qa-nonexistent'], confirm: 'wrong phrase' } }), 400, 'Delete confirmation guard')
  const compare = await call('/api/storage/verify', { actor: workspaceAdmin, method: 'POST' })
  assert.equal(compare.status, 200, `Drive compare: ${compare.payload?.message ?? ''}`)
  assert.ok(Number.isFinite(compare.payload.recorded) && Number.isFinite(compare.payload.reported))
  console.log(`Drive storage compare: recorded=${compare.payload.recorded} bytes, reported=${compare.payload.reported} bytes, difference=${compare.payload.percentDifference}%`)
  step('Phase 10 PWA assets, admin storage, delete guard, and Drive comparison endpoint (see discrepancy above)')

  // Phase 11: page/API guard, then a real temporary AAL2 TOTP session.
  assert.equal((await call('/platform')).status, 307, 'Anonymous platform redirect')
  expect(await call('/api/platform/agencies', { actor: workspaceAdmin }), 403, 'Agency admin platform API')
  assert.equal((await call('/platform', { actor: workspaceAdmin })).status, 307, 'Agency admin platform page redirect')
  expect(await call('/api/platform/agencies', { actor: owner }), 403, 'Owner AAL1 platform API')
  const aal1Page = await call('/platform', { actor: owner })
  assert.ok(aal1Page.status === 307 || (aal1Page.status === 200 && /platform\\?\/mfa|platform\/mfa/.test(aal1Page.payload)),
    `Owner AAL1 destination: HTTP ${aal1Page.status}`)
  assert.equal((await call('/platform/mfa', { actor: owner })).status, 200, 'Owner MFA setup page')
  const enrolled = checked(await owner.client.auth.mfa.enroll({ factorType: 'totp', friendlyName: `QA ${tag}` }), 'QA TOTP enrolment')
  checked(await owner.client.auth.mfa.challengeAndVerify({ factorId: enrolled.id, code: totp(enrolled.totp.secret) }), 'QA TOTP verification')
  const assurance = checked(await owner.client.auth.mfa.getAuthenticatorAssuranceLevel(), 'QA assurance')
  assert.equal(assurance.currentLevel, 'aal2')
  const agencies = expect(await call('/api/platform/agencies', { actor: owner }), 200, 'Owner AAL2 agency list')
  assert.ok(agencies.agencies.some((agency) => agency.id === 'ag-1'))
  assert.equal((await call('/platform', { actor: owner })).status, 200, 'Owner AAL2 console')
  step('Phase 11 agency/admin denial, AAL1 lock, real TOTP AAL2, and platform console/API access')

  await db.query('update notifications set read_at=null where id=$1', [noteId])
  await startBrowser()
  await browserCookies(workspaceAdmin)
  await visit('/admin/clients', 'Clients')
  for (let retry = 0; retry < 30; retry++) {
    if (await evaluate(`!!document.querySelector('button[aria-label="Notifications, 1 unread"]')`)) break
    await sleep(250)
  }
  assert.ok(await evaluate(`!!document.querySelector('button[aria-label="Notifications, 1 unread"]')`), 'Bell shows one unread note')
  await evaluate(`document.querySelector('button[aria-label="Notifications, 1 unread"]').click()`)
  assert.ok(await evaluate(`document.querySelector('[role="dialog"][aria-label="Notifications"]')?.innerText.includes('QA notification')`))
  await evaluate(`document.querySelector('.bell-head button').click()`)
  for (let retry = 0; retry < 30; retry++) {
    if ((await one('select read_at from notifications where id=$1', [noteId])).read_at) break
    await sleep(250)
  }
  assert.ok((await one('select read_at from notifications where id=$1', [noteId])).read_at, 'Bell marks all read')
  await visit('/admin/team', 'Team')
  await visit('/admin/scope', 'Scope of work')
  await visit('/account/notifications', 'Quiet hours')
  step('Phase 8 bell UI and Phase 9 team/scope browser pages')

  await browserCookies(owner)
  await visit('/platform', 'Onboard an agency')
  assert.ok(await evaluate(`document.body.innerText.includes('Agencies')`))
  step('Phase 11 AAL2 platform console renders in Edge')
}
