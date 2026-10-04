/** Temporary live cameraman QA. Dry-run by default; --apply creates and cleans up a test identity. */
import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { google } from 'googleapis'

const apply = process.argv.includes('--apply')
const base = 'http://localhost:3000'
const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL, ssl: { rejectUnauthorized: false } })
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } })
const qaId = randomUUID()
const qaEmail = `qa-cameraman-${qaId.slice(0, 12)}@example.invalid`
const qaPassword = randomBytes(32).toString('base64url')
const fileName = `qa-resume-${qaId.slice(0, 12)}.bin`
const fileSize = 9 * 1024 * 1024
const firstChunk = 8 * 1024 * 1024
let shoot, authId, sessionId, driveFileId, inserted = false, reassigned = false
let initialRawAt, initialMarkedBy

function checked(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`)
  return result.data
}

function cookieHeader(cookies) {
  return [...cookies].map(([name, value]) => `${name}=${encodeURIComponent(value)}`).join('; ')
}

async function api(path, cookie, init = {}) {
  const response = await fetch(`${base}${path}`, {
    ...init, redirect: 'manual',
    headers: { Cookie: cookie, ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(60000),
  })
  const data = await response.json().catch(() => null)
  return { status: response.status, data, location: response.headers.get('location') }
}

async function signIn() {
  const jar = new Map()
  const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (items) => items.forEach(({ name, value }) => jar.set(name, value)),
    },
  })
  const data = checked(await client.auth.signInWithPassword({ email: qaEmail, password: qaPassword }), 'QA sign-in')
  assert.ok(data.session?.access_token && jar.size, 'QA sign-in did not produce session cookies')
  const claims = JSON.parse(Buffer.from(data.session.access_token.split('.')[1], 'base64url').toString())
  assert.equal(claims.workspace_role, 'cameraman')
  assert.equal(claims.workspace_user_id, qaId)
  return cookieHeader(jar)
}

async function cleanup() {
  const errors = []
  async function attempt(label, work) { try { await work() } catch (error) { errors.push(`${label}: ${error.message}`) } }
  let driveRemoved = !driveFileId
  if (driveFileId) await attempt('Drive QA file', async () => {
    const auth = new google.auth.JWT({ email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/drive'] })
    const drive = google.drive({ version: 'v3', auth })
    const file = await drive.files.get({ fileId: driveFileId, fields: 'name,capabilities(canTrash,canDelete)', supportsAllDrives: true })
    assert.equal(file.data.name, fileName, 'Drive file was not the QA upload')
    if (file.data.capabilities?.canDelete) await drive.files.delete({ fileId: driveFileId, supportsAllDrives: true })
    else if (file.data.capabilities?.canTrash) await drive.files.update({ fileId: driveFileId, requestBody: { trashed: true }, supportsAllDrives: true })
    else throw new Error('Service account cannot remove the QA file')
    driveRemoved = true
  })
  if (driveFileId && driveRemoved) await attempt('raw_files row', async () => {
    await db.query('delete from raw_files where drive_file_id=$1 and file_name=$2', [driveFileId, fileName])
  })
  if (sessionId) await attempt('upload session', async () => {
    await db.query('delete from upload_sessions where id=$1 and started_by=$2', [sessionId, qaId])
  })
  if (shoot) await attempt('idea arrival stamp', async () => {
    await db.query('update shoot_items set raw_uploaded_at=$1,marked_by=$2 where shoot_id=$3 and content_item_id=$4',
      [initialRawAt, initialMarkedBy, shoot.id, shoot.content_item_id])
  })
  if (reassigned) await attempt('shoot assignment', async () => {
    const result = await db.query('update shoots set cameraman_id=$1 where id=$2 and cameraman_id=$3',
      [shoot.original_cameraman_id, shoot.id, qaId])
    assert.equal(result.rowCount, 1, 'QA shoot assignment was not restored')
  })
  if (authId) await attempt('Auth identity', async () => {
    checked(await admin.auth.admin.deleteUser(authId), 'QA Auth deletion')
  })
  if (inserted) await attempt('workspace user', async () => {
    await db.query('delete from users where id=$1 and email=$2', [qaId, qaEmail])
  })
  if (errors.length) throw new Error(`QA cleanup incomplete: ${errors.join(' | ')}`)
  console.log('QA cleanup complete: original shoot assignment restored; QA identity and test records removed.')
}

await db.connect()
try {
  const target = await db.query(`
    select s.id,s.agency_id,s.cameraman_id as original_cameraman_id,si.content_item_id,
      si.raw_uploaded_at,si.marked_by,c.manager_id,
      (select count(*)::int from shoot_items where shoot_id=s.id) as idea_count,
      (select count(*)::int from shoot_items x where x.shoot_id=s.id and not exists
        (select 1 from raw_files r where r.shoot_id=x.shoot_id and r.content_item_id=x.content_item_id)) as missing_ideas
    from shoots s join clients c on c.id=s.client_id
    join shoot_items si on si.shoot_id=s.id
    join raw_files r on r.shoot_id=s.id and r.content_item_id=si.content_item_id
    join shoot_folder_jobs j on j.shoot_id=s.id and j.status='complete'
    where s.title='Title of Sasuke' and s.status='scheduled' and r.file_name='sample-5s.mp4'
    limit 1
  `)
  assert.equal(target.rowCount, 1, 'Expected the prepared test shoot with its completed sample upload')
  shoot = target.rows[0]
  assert.ok(shoot.idea_count >= 2 && shoot.missing_ideas >= 1, 'Test shoot could transition on another upload')
  initialRawAt = shoot.raw_uploaded_at
  initialMarkedBy = shoot.marked_by
  const actor = await db.query(`select id from users where agency_id=$1 and role='admin' and is_active order by id limit 1`, [shoot.agency_id])
  assert.equal(actor.rowCount, 1)
  if (!apply) {
    console.log(`Dry run: would create a temporary cameraman, assign ${shoot.id} for QA, test role routes and a 9 MiB two-chunk resume, then clean up.`)
  } else {
    await db.query(`insert into users(id,agency_id,email,full_name,initials,role,avatar_gradient,is_active)
      values($1,$2,$3,'QA Cameraman','QC','cameraman','linear-gradient(135deg,#8172F3,#5340CE)',true)`,
    [qaId, shoot.agency_id, qaEmail])
    inserted = true
    const created = checked(await admin.auth.admin.createUser({ email: qaEmail, password: qaPassword, email_confirm: true }), 'QA Auth creation')
    authId = created.user.id
    const link = await db.query('select auth_user_id from users where id=$1', [qaId])
    assert.equal(link.rows[0].auth_user_id, authId, 'Auth hook did not link the invited QA user')
    const assignment = await db.query('update shoots set cameraman_id=$1 where id=$2 and cameraman_id=$3',
      [qaId, shoot.id, shoot.original_cameraman_id])
    assert.equal(assignment.rowCount, 1)
    reassigned = true
    let cookie = await signIn()
    const own = await api('/api/shoots', cookie)
    assert.equal(own.status, 200)
    assert.deepEqual(own.data.shoots.map((item) => item.id), [shoot.id], 'Cameraman saw an unassigned shoot')
    const page = await api('/cameraman/shoots', cookie)
    assert.equal(page.status, 200, 'Cameraman calendar did not load')
    const denied = await api('/admin/calendar', cookie)
    assert.ok(denied.status >= 300 && denied.status < 400 && denied.location?.includes('/403'), 'Admin page was not blocked')
    const other = await db.query(`select s.id,si.content_item_id from shoots s join shoot_items si on si.shoot_id=s.id
      where s.agency_id=$1 and s.id<>$2 order by s.id limit 1`, [shoot.agency_id, shoot.id])
    assert.equal(other.rowCount, 1)
    const blocked = await api('/api/upload/session', cookie, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shootId: other.rows[0].id, contentItemId: other.rows[0].content_item_id,
        fileName, fileSizeBytes: fileSize, mimeType: 'application/octet-stream' }) })
    assert.equal(blocked.status, 403, 'Other cameraman shoot did not return 403')
    console.log('Role checks passed: own shoot visible, calendar loads, admin route blocked, other shoot upload returns 403.')

    const started = await api('/api/upload/session', cookie, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shootId: shoot.id, contentItemId: shoot.content_item_id,
        fileName, fileSizeBytes: fileSize, mimeType: 'application/octet-stream' }) })
    assert.equal(started.status, 200, `Upload session creation failed: ${started.data?.message ?? started.status}`)
    sessionId = started.data.sessionId
    const uri = started.data.sessionUri
    assert.ok(sessionId && uri && !JSON.stringify(started.data).includes('session_uri_enc'))
    const first = await fetch(uri, { method: 'PUT', headers: { 'Content-Range': `bytes 0-${firstChunk - 1}/${fileSize}` },
      body: Buffer.alloc(firstChunk), signal: AbortSignal.timeout(120000) })
    assert.equal(first.status, 308, `First chunk returned ${first.status}`)
    const progress = await api(`/api/upload/progress?sessionId=${encodeURIComponent(sessionId)}`, cookie)
    assert.equal(progress.status, 200)
    assert.equal(progress.data.bytesReceived, firstChunk)
    const active = await api('/api/upload/active', cookie)
    assert.equal(active.status, 200)
    assert.ok(active.data.sessions.some((entry) => entry.id === sessionId && entry.bytes_received === firstChunk))
    cookie = await signIn() // new session simulates reopening the browser after closing the tab
    const resumed = await api(`/api/upload/progress?sessionId=${encodeURIComponent(sessionId)}`, cookie)
    assert.equal(resumed.status, 200)
    assert.equal(resumed.data.bytesReceived, firstChunk, 'Resume restarted from zero')
    const final = await fetch(resumed.data.sessionUri, { method: 'PUT',
      headers: { 'Content-Range': `bytes ${firstChunk}-${fileSize - 1}/${fileSize}` },
      body: Buffer.alloc(fileSize - firstChunk), signal: AbortSignal.timeout(120000) })
    assert.ok(final.ok, `Final chunk returned ${final.status}`)
    driveFileId = (await final.json()).id
    assert.ok(driveFileId)
    const completeBody = JSON.stringify({ sessionId, driveFileId })
    const completed = await api('/api/upload/complete', cookie,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: completeBody })
    assert.equal(completed.status, 200, `Upload completion failed: ${completed.data?.message ?? completed.status}`)
    const replay = await api('/api/upload/complete', cookie,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: completeBody })
    assert.equal(replay.status, 200, 'Completion replay was not idempotent')
    const copies = await db.query('select count(*)::int as count from raw_files where drive_file_id=$1', [driveFileId])
    assert.equal(copies.rows[0].count, 1)
    console.log('Resume passed: 8 MiB saved, new sign-in resumed at the same byte count, 9 MiB completed, completion replay created one row.')
  }
} finally {
  try { if (apply) await cleanup() } finally { await db.end() }
}
