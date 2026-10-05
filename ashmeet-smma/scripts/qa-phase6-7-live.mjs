/** Reversible live HTTP/browser checks for the Phase 6 and 7 workflows. Dry-run by default. */
import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { rm } from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { google } from 'googleapis'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

const apply = process.argv.includes('--apply')
const base = (process.env.QA_BASE_URL || process.env.NEXT_PUBLIC_APP_URL).replace(/\/$/, '')
const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL, ssl: { rejectUnauthorized: false } })
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } })
const tag = `qa-p67-${randomUUID().slice(0, 8)}`
const agency = 'ag-1'
const people = ['admin', 'brand_manager', 'brand_manager', 'editor'].map((role, index) => ({
  id: `${tag}-user-${index}`, role, email: `${tag}-${index}@example.invalid`,
  name: `QA P67 ${role} ${index}`, password: randomBytes(32).toString('base64url'), authId: null, inserted: false, cookie: '',
}))
const [owner, manager, otherManager, editor] = people
const clientId = `${tag}-client`
const itemIds = []
const objectKeys = []
let clientInserted = false
let clipBuffer
let browser, browserSocket, browserCommand
const workspace = path.resolve(process.cwd())
const profile = path.resolve(workspace, `.qa-p67-edge-${tag}`)
assert.ok(profile.startsWith(`${workspace}${path.sep}`))
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const b2 = new S3Client({ endpoint: process.env.B2_ENDPOINT, region: process.env.B2_REGION, forcePathStyle: true,
  credentials: { accessKeyId: process.env.B2_KEY_ID, secretAccessKey: process.env.B2_APPLICATION_KEY } })

async function one(sql, values = []) { return (await db.query(sql, values)).rows[0] }
function checked(result, label) { if (result.error) throw new Error(`${label}: ${result.error.message}`); return result.data }
function step(label) { console.log(`PASS ${label}`) }

async function signIn(person) {
  const jar = new Map()
  const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (items) => items.forEach(({ name, value }) => jar.set(name, value)) },
  })
  const result = checked(await client.auth.signInWithPassword({ email: person.email, password: person.password }), 'QA sign-in')
  const claims = JSON.parse(Buffer.from(result.session.access_token.split('.')[1], 'base64url').toString())
  assert.equal(claims.workspace_role, person.role)
  assert.equal(claims.workspace_user_id, person.id)
  person.cookie = [...jar].map(([name, value]) => `${name}=${encodeURIComponent(value)}`).join('; ')
}

async function call(path, { actor, method = 'GET', body, cookie } = {}) {
  const response = await fetch(`${base}${path}`, { method, redirect: 'manual', signal: AbortSignal.timeout(60000),
    headers: { ...(actor?.cookie || cookie ? { Cookie: cookie ?? actor.cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined })
  const type = response.headers.get('content-type') ?? ''
  const payload = type.includes('application/json') ? await response.json() : await response.text()
  return { status: response.status, payload, headers: response.headers }
}
function expect(result, status, label) {
  assert.equal(result.status, status, `${label}: HTTP ${result.status}, ${typeof result.payload === 'string' ? result.payload.slice(0, 180) : result.payload?.message ?? ''}`)
  return result.payload
}

async function makeItem(status, versionStatus = 'submitted') {
  const id = `${tag}-item-${itemIds.length + 1}`
  itemIds.push(id)
  await db.query(`insert into content_items(id,agency_id,client_id,title,slug,type,status,planned_date,assigned_editor_id,created_by)
    values($1,$2,$3,$4,$1,'reel',$5,current_date,$6,$7)`, [id, agency, clientId, `QA P67 item ${itemIds.length} ${tag}`, status, editor.id, manager.id])
  const versionId = `${id}-v1`
  const key = objectKeys[0]
  await db.query(`insert into deliverable_versions(id,agency_id,content_item_id,version,b2_key,file_size_bytes,duration_seconds,uploaded_by,status)
    values($1,$2,$3,1,$4,2848208,5,$5,$6)`, [versionId, agency, id, key, editor.id, versionStatus])
  return { id, versionId }
}

async function cleanup() {
  const failures = []
  const attempt = async (name, fn) => { try { await fn() } catch (error) { failures.push(`${name}: ${error.message}`) } }
  browserSocket?.close(); browser?.kill()
  if (browser) await attempt('Edge profile', async () => {
    for (let retry = 0; retry < 10; retry++) {
      try { await rm(profile, { recursive: true, force: true }); return }
      catch (error) { if (error.code !== 'EBUSY' || retry === 9) throw error; await sleep(500) }
    }
  })
  await attempt('database rows', async () => {
    await db.query('begin')
    try {
      await db.query(`delete from approval_link_views where link_id in (select id from approval_links where content_item_id like $1)`, [`${tag}%`])
      await db.query(`delete from comments where version_id like $1`, [`${tag}%`])
      await db.query(`delete from approval_links where content_item_id like $1`, [`${tag}%`])
      await db.query(`delete from post_schedule where content_item_id like $1`, [`${tag}%`])
      await db.query(`delete from deliverable_versions where content_item_id like $1`, [`${tag}%`])
      await db.query(`delete from notifications where user_id like $1 or link like $2 or body like $2`, [`${tag}%`, `%${tag}%`])
      await db.query(`delete from activity_log where entity_id like $1 or actor_id like $1`, [`${tag}%`])
      await db.query(`delete from content_items where id like $1`, [`${tag}%`])
      if (clientInserted) await db.query('delete from clients where id=$1', [clientId])
      await db.query('commit')
    } catch (error) { await db.query('rollback'); throw error }
  })
  for (const person of people) if (person.authId) await attempt(`${person.role} Auth`, async () => {
    checked(await admin.auth.admin.deleteUser(person.authId), 'QA Auth deletion')
  })
  for (const person of people) if (person.inserted) await attempt(`${person.role} user`, async () => {
    await db.query('delete from users where id=$1', [person.id])
  })
  for (const key of objectKeys) await attempt('B2 object', async () => {
    await b2.send(new DeleteObjectCommand({ Bucket: process.env.B2_BUCKET, Key: key }))
  })
  if (failures.length) throw new Error(`QA cleanup incomplete: ${failures.join(' | ')}`)
  console.log('QA cleanup complete: temporary identities, records, and B2 object removed.')
}

async function startBrowser() {
  const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  const port = 9400 + Math.floor(Math.random() * 500)
  browser = spawn(edge, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' })
  let endpoint
  for (let attempt = 0; attempt < 60; attempt++) {
    try { const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); endpoint = pages.find((p) => p.type === 'page')?.webSocketDebuggerUrl }
    catch { /* Edge is still starting. */ }
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
  await browserCommand('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
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
async function setBrowserCookie(cookie) {
  const [name, ...value] = cookie.split('=')
  await browserCommand('Network.setCookie', { name, value: value.join('='), url: base })
}

await db.connect()
try {
  const result = await db.query(`select drive_file_id from raw_files where agency_id='ag-1' and file_name='sample-5s.mp4' limit 1`)
  const versions = await db.query(`select count(*)::int n from deliverable_versions where agency_id='ag-1'`)
  console.log(`Phase 6/7 QA preflight: sample Drive clips=${result.rows.length}, agency cut versions=${versions.rows[0].n}, base=${base}, test prefix=${tag}`)
  if (!apply) {
    console.log('Read-only preflight complete. Pass --apply to run temporary live checks.')
  } else {
    assert.ok(result.rows[0]?.drive_file_id, 'A real sample MP4 is needed for media checks')
    const jwt = new google.auth.JWT({ email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'), scopes: ['https://www.googleapis.com/auth/drive.readonly'] })
    const { token } = await jwt.getAccessToken()
    assert.ok(token)
    const clipResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(result.rows[0].drive_file_id)}?alt=media&supportsAllDrives=true`,
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(60000) })
    assert.equal(clipResponse.status, 200, 'Download real sample clip from agency Drive')
    const clip = Buffer.from(await clipResponse.arrayBuffer())
    clipBuffer = clip
    assert.ok(clip.length > 100_000, 'Real sample clip is nonempty')
    const key = `${agency}/cuts/${tag}/sample.mp4`
    objectKeys.push(key)
    await b2.send(new PutObjectCommand({ Bucket: process.env.B2_BUCKET, Key: key, Body: clip, ContentType: 'video/mp4' }))
    step('real MP4 copied temporarily from Drive to private B2 bucket')

    for (const person of people) {
      await db.query(`insert into users(id,agency_id,email,full_name,initials,role,avatar_gradient,is_active)
        values($1,$2,$3,$4,'QA',$5,'linear-gradient(140deg,#8F80F7,#5A4AD8)',true)`,
      [person.id, agency, person.email, person.name, person.role])
      person.inserted = true
      const created = checked(await admin.auth.admin.createUser({ email: person.email, password: person.password, email_confirm: true }), 'QA Auth creation')
      person.authId = created.user.id
      assert.equal((await one('select auth_user_id from users where id=$1', [person.id])).auth_user_id, person.authId)
      await signIn(person)
    }
    step('four temporary admin/manager/editor role sessions and JWT claims')
    await db.query(`insert into clients(id,agency_id,code,name,handle,niche,manager_id,status)
      values($1,$2,$3,'QA P67 Client','@qa-p67','QA',$4,'active')`, [clientId, agency, tag, manager.id])
    clientInserted = true
    await runChecks()
  }
} finally {
  try { if (apply) await cleanup() } finally { await db.end(); b2.destroy() }
}

async function runChecks() {
  const review = await makeItem('cut_submitted')
  const blocked = await call(`/api/review/${review.id}/decision`, { actor: manager, method: 'POST', body: { decision: 'changes' } })
  expect(blocked, 409, 'Changes without comment'); assert.match(blocked.payload.message, /comment/i)
  const added = expect(await call(`/api/versions/${review.versionId}/comments`, { actor: manager, method: 'POST',
    body: { body: 'Opening shot needs light', timestampStart: 1.1, timestampEnd: 3.4 } }), 201, 'Add timed comment').comment
  assert.equal(added.timestamp_start, 1.1); assert.equal(added.timestamp_end, 3.4)
  const list = expect(await call(`/api/versions/${review.versionId}/comments`, { actor: editor }), 200, 'Editor reads comments')
  assert.equal(list.comments.find((comment) => comment.id === added.id)?.body, 'Opening shot needs light')
  expect(await call(`/api/comments/${added.id}`, { actor: editor, method: 'PATCH', body: { body: 'tampered' } }), 403, 'Editor cannot edit manager comment')
  expect(await call(`/api/comments/${added.id}`, { actor: manager, method: 'PATCH', body: { body: 'Opening shot needs softer light' } }), 200, 'Author edits comment')
  expect(await call(`/api/comments/${added.id}`, { actor: editor, method: 'PATCH', body: { resolved: true } }), 200, 'Editor resolves comment')
  expect(await call(`/api/comments/${added.id}`, { actor: manager, method: 'PATCH', body: { resolved: false } }), 200, 'Reviewer reopens comment')
  step('timed comments, author-only edit, editor resolve, and no-comment review rejection')

  const voice = expect(await call('/api/voice-notes/presign', { actor: manager, method: 'POST',
    body: { versionId: review.versionId, ext: 'mp4' } }), 200, 'Voice note presign')
  assert.equal(voice.maxSeconds, 120)
  const voiceKey = `${agency}/voice-notes/${review.versionId}/${voice.commentId}.mp4`
  objectKeys.push(voiceKey)
  const voiceUpload = await fetch(voice.uploadUrl, { method: 'PUT', headers: { 'Content-Type': voice.contentType },
    body: clipBuffer, signal: AbortSignal.timeout(30000) })
  assert.ok(voiceUpload.ok, `Voice note B2 PUT: ${voiceUpload.status}`)
  const voiceComment = expect(await call(`/api/versions/${review.versionId}/comments`, { actor: manager,
    method: 'POST', body: { body: 'Voice note test', voice: { commentId: voice.commentId, ext: 'mp4' } } }), 201, 'Save voice comment').comment
  assert.equal(voiceComment.has_voice, true)
  const voicePlay = expect(await call(`/api/comments/${voice.commentId}/voice`, { actor: editor }), 200, 'Editor opens voice note')
  const voiceBytes = await fetch(voicePlay.url, { headers: { Range: 'bytes=0-99' }, signal: AbortSignal.timeout(30000) })
  assert.equal(voiceBytes.status, 206); assert.equal((await voiceBytes.arrayBuffer()).byteLength, 100)
  const transcript = expect(await call(`/api/comments/${voice.commentId}/transcribe`, { actor: manager, method: 'POST' }), 200, 'Transcription failure status')
  assert.equal(transcript.transcript_status, 'failed')
  assert.equal((await one('select transcript_status from comments where id=$1', [voice.commentId])).transcript_status, 'failed')
  step('voice presign, B2 PUT, saved comment, editor playback URL, and safe transcription failure')

  expect(await call(`/api/review/${review.id}/decision`, { actor: manager, method: 'POST', body: { decision: 'changes' } }), 200, 'Send changes')
  assert.equal((await one('select status from content_items where id=$1', [review.id])).status, 'changes_requested')
  const redo = await call('/editor/redo', { actor: editor })
  assert.equal(redo.status, 200); assert.match(redo.payload, /QA P67 item 1/)
  expect(await call(`/api/review/${review.id}/decision`, { actor: editor, method: 'POST', body: { decision: 'approve' } }), 403, 'Editor cannot approve')
  step('send changes puts the idea in the editor Re-do page and forbids editor approval')

  const v2 = `${review.id}-v2`
  await db.query(`insert into deliverable_versions(id,agency_id,content_item_id,version,b2_key,file_size_bytes,duration_seconds,uploaded_by,status)
    values($1,$2,$3,2,$4,2848208,5,$5,'submitted')`, [v2, agency, review.id, objectKeys[0], editor.id])
  await db.query(`update content_items set status='cut_submitted' where id=$1`, [review.id])
  const v2Comments = expect(await call(`/api/versions/${v2}/comments`, { actor: manager }), 200, 'New version comments')
  assert.equal(v2Comments.comments.length, 0)
  expect(await call(`/api/review/${review.id}/decision`, { actor: manager, method: 'POST', body: { decision: 'approve' } }), 200, 'Approve new cut')
  assert.equal((await one('select status from deliverable_versions where id=$1', [v2])).status, 'internally_approved')
  const link = expect(await call(`/api/review/${review.id}/link`, { actor: manager, method: 'POST' }), 201, 'Generate client link')
  assert.ok(/^\d{4}$/.test(link.pin)); assert.ok(new URL(link.url).pathname.startsWith('/approve/'))
  const token = link.url.split('/').pop()
  const stored = await one(`select token_hash,pin_hash,expires_at from approval_links where content_item_id=$1 order by created_at desc limit 1`, [review.id])
  assert.ok(stored.token_hash !== token && stored.pin_hash !== link.pin)
  const summary = expect(await call(`/api/review/${review.id}/link`, { actor: manager }), 200, 'Link summary')
  assert.equal(summary.link.active, true); assert.equal(summary.pin, undefined); assert.equal(summary.url, undefined)
  assert.equal((await one('select status from content_items where id=$1', [review.id])).status, 'with_client')
  step('v1/v2 comment isolation, approval, one-time hashed link, and with-client status')

  const page = await call(`/approve/${token}`)
  assert.equal(page.status, 200); assert.match(page.payload, /Enter your PIN/)
  const wrong = await call(`/api/approve/${token}/verify`, { method: 'POST', body: { pin: link.pin === '0000' ? '0001' : '0000' } })
  expect(wrong, 401, 'Wrong PIN'); assert.equal(wrong.payload.remaining, 4)
  const valid = await call(`/api/approve/${token}/verify`, { method: 'POST', body: { pin: link.pin } })
  expect(valid, 200, 'Correct PIN')
  const publicCookie = valid.headers.get('set-cookie')?.split(';')[0]
  assert.ok(publicCookie)
  await startBrowser()
  await setBrowserCookie(publicCookie)
  await visit(`/approve/${token}`, 'Request changes')
  for (let retry = 0; retry < 30; retry++) {
    if (await evaluate('!!document.querySelector("video.approve-video")')) break
    await sleep(500)
  }
  const publicLayout = await evaluate(`({width:innerWidth,documentWidth:document.documentElement.scrollWidth,
    bodyWidth:document.body.scrollWidth,video:!!document.querySelector('video.approve-video'),
    approve:document.body.innerText.includes('Approve'),changes:document.body.innerText.includes('Request changes')})`)
  assert.ok(publicLayout.video && publicLayout.approve && publicLayout.changes)
  assert.ok(publicLayout.documentWidth <= 390 && publicLayout.bodyWidth <= 390, `Public page overflows at 390px: ${JSON.stringify(publicLayout)}`)
  const playback = await evaluate(`(async()=>{ const v=document.querySelector('video.approve-video'); v.muted=true;
    try { await Promise.race([v.play(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('play timeout')),20000))]);
      await new Promise(resolve=>setTimeout(resolve,1800)); const result={time:v.currentTime,readyState:v.readyState,error:v.error?.message??null}; v.pause(); return result }
    catch(error){ return {time:v.currentTime,readyState:v.readyState,error:String(error)} } })()`)
  assert.ok(playback.time > 0 || playback.readyState >= 3, `Client MP4 did not play in Edge: ${JSON.stringify(playback)}`)
  step('390px Edge client page shows video and actions with no horizontal overflow')
  const media = expect(await call(`/api/approve/${token}/media`, { cookie: publicCookie }), 200, 'Client media')
  assert.ok(media.url.includes('sample.mp4'))
  const bytes = await fetch(media.url, { headers: { Range: 'bytes=0-99' }, signal: AbortSignal.timeout(30000) })
  assert.equal(bytes.status, 206)
  assert.equal((await bytes.arrayBuffer()).byteLength, 100)
  expect(await call(`/api/approve/${token}/respond`, { method: 'POST', cookie: publicCookie, body: { response: 'approved' } }), 200, 'Client approves')
  assert.equal((await one('select status from content_items where id=$1', [review.id])).status, 'client_approved')
  assert.equal((await one('select status from deliverable_versions where id=$1', [v2])).status, 'client_approved')
  expect(await call(`/api/approve/${token}/respond`, { method: 'POST', cookie: publicCookie, body: { response: 'approved' } }), 409, 'Double response')
  expect(await call(`/api/review/${review.id}/reopen`, { actor: manager, method: 'POST', body: { note: 'Late client change' } }), 200, 'Reopen approved item')
  assert.equal((await one('select status from content_items where id=$1', [review.id])).status, 'client_changes')
  step('public PIN, video range, one-time client approval, and late reopen')

  const changes = await makeItem('internally_approved', 'internally_approved')
  const first = expect(await call(`/api/review/${changes.id}/link`, { actor: manager, method: 'POST' }), 201, 'Changes link')
  expect(await call(`/api/review/${changes.id}/link`, { actor: manager, method: 'DELETE' }), 200, 'Revoke link')
  const firstPage = await call(`/approve/${first.url.split('/').pop()}`)
  assert.equal(firstPage.status, 200); assert.match(firstPage.payload, /This link is no longer active/i)
  const second = expect(await call(`/api/review/${changes.id}/link`, { actor: manager, method: 'POST' }), 201, 'Regenerate link')
  assert.notEqual(second.url, first.url)
  const secondToken = second.url.split('/').pop()
  const verified = await call(`/api/approve/${secondToken}/verify`, { method: 'POST', body: { pin: second.pin } })
  expect(verified, 200, 'PIN after regeneration')
  const notes = 'Please keep this client feedback exactly: warmer lighting.'
  expect(await call(`/api/approve/${secondToken}/respond`, { method: 'POST', cookie: verified.headers.get('set-cookie')?.split(';')[0],
    body: { response: 'changes', text: notes } }), 200, 'Client requests changes')
  assert.equal((await one(`select body from comments where version_id=$1 and source='client' order by created_at desc limit 1`, [changes.versionId])).body, notes)
  assert.equal((await one('select status from content_items where id=$1', [changes.id])).status, 'client_changes')
  step('revoked link, regenerated link, and verbatim client changes')

  const locked = await makeItem('internally_approved', 'internally_approved')
  const lockLink = expect(await call(`/api/review/${locked.id}/link`, { actor: manager, method: 'POST' }), 201, 'Lock test link')
  const lockToken = lockLink.url.split('/').pop()
  for (let attempt = 1; attempt <= 5; attempt++) {
    const response = await call(`/api/approve/${lockToken}/verify`, { method: 'POST', body: { pin: lockLink.pin === '0000' ? '0001' : '0000' } })
    assert.equal(response.status, attempt === 5 ? 423 : 401)
  }
  const lockedPage = await call(`/approve/${lockToken}`)
  assert.equal(lockedPage.status, 200); assert.match(lockedPage.payload, /locked/i)
  await db.query(`update approval_links set expires_at=now()-interval '1 minute' where content_item_id=$1`, [locked.id])
  const expiredPage = await call(`/approve/${lockToken}`)
  assert.equal(expiredPage.status, 200); assert.match(expiredPage.payload, /expired/i)
  step('five wrong PINs lock a link; expired and revoked states render distinctly')

  const postItem = await makeItem('client_approved', 'client_approved')
  const nearbyItem = await makeItem('client_approved', 'client_approved')
  const invalid = await call('/api/posting', { actor: manager, method: 'POST', body: {
    itemId: changes.id, scheduledAt: new Date().toISOString(), caption: 'x', music: '' } })
  expect(invalid, 409, 'Cannot schedule unapproved item'); assert.match(invalid.payload.message, /client changes/i)
  const past = new Date(Date.now() - 3 * 864e5).toISOString()
  const caption = `${'Long caption line.\n'.repeat(120)}The final line.`
  assert.ok(caption.length > 2000)
  const before = (await one(`select count(*)::int n from content_items where client_id=$1 and status='posted' and planned_date>=date_trunc('month',current_date)::date and planned_date<(date_trunc('month',current_date)+interval '1 month')::date`, [clientId])).n
  const scheduled = expect(await call('/api/posting', { actor: manager, method: 'POST', body: {
    itemId: postItem.id, scheduledAt: past, caption, music: 'QA melody' } }), 201, 'Schedule a post').post
  assert.equal((await one('select status from content_items where id=$1', [postItem.id])).status, 'scheduled')
  assert.equal((await one('select caption from post_schedule where id=$1', [scheduled.id])).caption, caption)
  const month = new Date(past).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).slice(0, 7)
  const grid = expect(await call(`/api/posting?month=${month}`, { actor: manager }), 200, 'Manager posting grid')
  assert.ok(grid.posts.some((post) => post.id === scheduled.id)); assert.ok(grid.overdue.some((post) => post.id === scheduled.id))
  const scoped = expect(await call(`/api/posting?month=${month}`, { actor: otherManager }), 200, 'Other manager posting grid')
  assert.ok(!scoped.posts.some((post) => post.id === scheduled.id))
  const managerPage = await call('/manager/posting', { actor: manager })
  assert.equal(managerPage.status, 200); assert.match(managerPage.payload, /Posting schedule/)
  const adminPage = await call('/admin/posting', { actor: owner })
  assert.equal(adminPage.status, 200); assert.match(adminPage.payload, /Posting schedule/)
  for (const cookie of manager.cookie.split('; ')) await setBrowserCookie(cookie)
  await visit('/manager/posting', 'Posting schedule')
  for (let retry = 0; retry < 30; retry++) {
    if (await evaluate(`document.body.innerText.includes(${JSON.stringify('QA P67 item 4')})`)) break
    await sleep(500)
  }
  const postingLayout = await evaluate(`({width:innerWidth,documentWidth:document.documentElement.scrollWidth,
    bodyWidth:document.body.scrollWidth,overdue:document.body.innerText.includes('Overdue'),
    testPost:document.body.innerText.includes('QA P67 item 4'), offenders:[...document.querySelectorAll('*')]
      .map(e=>({tag:e.tagName,cls:e.className?.baseVal??e.className,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width}))
      .filter(e=>e.right>391||e.left< -1).slice(0,15)})`)
  assert.ok(postingLayout.overdue && postingLayout.testPost, `Posting page missed live post: ${JSON.stringify(postingLayout)}`)
  assert.ok(postingLayout.documentWidth <= 390 && postingLayout.bodyWidth <= 390, `Posting page overflows at 390px: ${JSON.stringify(postingLayout)}`)
  const postedDay = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', day: 'numeric' }).format(new Date(past)))
  const clicked = await evaluate(`(()=>{ const day=[...document.querySelectorAll('button.cal-day')].find(button=>button.getAttribute('aria-label')?.startsWith('${postedDay} '));
    day?.click(); return !!day })()`)
  assert.ok(clicked, 'Scheduled day is clickable in the posting calendar')
  for (let retry = 0; retry < 20; retry++) {
    if (await evaluate(`document.body.innerText.includes('The final line.')`)) break
    await sleep(250)
  }
  const captionLayout = await evaluate(`({fullCaption:document.body.innerText.includes('The final line.'),width:document.documentElement.scrollWidth})`)
  assert.ok(captionLayout.fullCaption && captionLayout.width <= 390, `Full caption is not readable at 390px: ${JSON.stringify(captionLayout)}`)
  step('posting schedule, 2,000+ character caption, overdue list, and manager scoping')

  const near = expect(await call(`/api/posting/nearby?clientId=${clientId}&at=${encodeURIComponent(past)}&exclude=${nearbyItem.id}`, { actor: manager }), 200, 'Nearby warning')
  assert.ok(near.nearby.some((post) => post.content_item_id === postItem.id))
  const later = new Date(Date.now() + 864e5).toISOString()
  const edited = expect(await call(`/api/posting/${scheduled.id}`, { actor: manager, method: 'PATCH', body: {
    scheduledAt: later, caption: 'Edited caption', music: 'New audio' } }), 200, 'Edit post')
  assert.equal(edited.post.caption, 'Edited caption')
  expect(await call(`/api/posting/${scheduled.id}`, { actor: manager, method: 'PATCH', body: {
    scheduledAt: past, caption: 'Overdue again', music: '' } }), 200, 'Move post back to past')
  const download = expect(await call(`/api/posting/${scheduled.id}/download`, { actor: manager }), 200, 'Download approved cut')
  assert.match(download.filename, /qa-p67.*v1\.mp4/i)
  const file = await fetch(download.url, { headers: { Range: 'bytes=0-99' }, signal: AbortSignal.timeout(30000) })
  assert.equal(file.status, 206); assert.equal((await file.arrayBuffer()).byteLength, 100)
  assert.match(file.headers.get('content-disposition') ?? '', /attachment.*\.mp4/i)
  step('nearby warning data, editing, and presigned final-cut ranged download')

  expect(await call(`/api/posting/${scheduled.id}/posted`, { actor: manager, method: 'POST', body: { posted: true } }), 200, 'Mark posted')
  assert.equal((await one('select status from content_items where id=$1', [postItem.id])).status, 'posted')
  const after = (await one(`select count(*)::int n from content_items where client_id=$1 and status='posted' and planned_date>=date_trunc('month',current_date)::date and planned_date<(date_trunc('month',current_date)+interval '1 month')::date`, [clientId])).n
  assert.equal(after, before + 1)
  const scopeMonth = new Date().toISOString().slice(0, 7)
  const clientDashboard = expect(await call(`/api/clients?month=${scopeMonth}`, { actor: owner }), 200, 'Live scope dashboard')
  const sqlCounts = await db.query(`select c.id, count(ci.id)::int delivered from clients c left join content_items ci
    on ci.client_id=c.id and ci.status='posted' and ci.planned_date >= $1::date and ci.planned_date < ($1::date + interval '1 month')
    where c.agency_id=$2 group by c.id`, [`${scopeMonth}-01`, agency])
  const byClient = new Map(sqlCounts.rows.map((row) => [row.id, row.delivered]))
  for (const client of clientDashboard.clients) assert.equal(client.delivered, byClient.get(client.id), `Scope count for ${client.name}`)
  assert.equal(clientDashboard.clients.find((client) => client.id === clientId)?.delivered, before + 1)
  step('live scope delivered counts match SQL for every client in the agency')
  const afterGrid = expect(await call(`/api/posting?month=${month}`, { actor: manager }), 200, 'Overdue after posting')
  assert.ok(!afterGrid.overdue.some((post) => post.id === scheduled.id))
  expect(await call(`/api/posting/${scheduled.id}/posted`, { actor: manager, method: 'POST', body: { posted: false } }), 200, 'Undo posted')
  assert.equal((await one('select status from content_items where id=$1', [postItem.id])).status, 'scheduled')
  const afterUndo = expect(await call(`/api/clients?month=${scopeMonth}`, { actor: owner }), 200, 'Scope after undo')
  assert.equal(afterUndo.clients.find((client) => client.id === clientId)?.delivered, before)
  await db.query(`update post_schedule set posted_at=now()-interval '25 hours' where id=$1`, [scheduled.id])
  expect(await call(`/api/posting/${scheduled.id}/posted`, { actor: manager, method: 'POST', body: { posted: false } }), 409, 'Undo after 24 hours')
  step('posted count +1, overdue removal, undo, and 24-hour undo block')
}
