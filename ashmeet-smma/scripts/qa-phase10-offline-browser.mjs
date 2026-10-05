/** Temporary Phase 10 offline cameraman browser QA with a disposable Auth identity. Dry-run by default. */
import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { rm } from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

const apply = process.argv.includes('--apply')
const base = (process.env.QA_BASE_URL || process.env.NEXT_PUBLIC_APP_URL).replace(/\/$/, '')
const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL, ssl: { rejectUnauthorized: false } })
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } })
const qaId = randomUUID()
const email = `qa-cameraman-${qaId.slice(0, 12)}@example.invalid`
const password = randomBytes(32).toString('base64url')
const workspace = path.resolve(process.cwd())
const profile = path.resolve(workspace, `.qa-edge-profile-${qaId.slice(0, 8)}`)
assert.ok(profile.startsWith(`${workspace}${path.sep}`), 'Browser profile must stay inside workspace')
const port = 9333
let authId, inserted = false, browser, connection
const assigned = []

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
function checked(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`)
  return result.data
}

async function signInCookies() {
  const jar = new Map()
  const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (items) => items.forEach(({ name, value }) => jar.set(name, value)),
    },
  })
  const data = checked(await client.auth.signInWithPassword({ email, password }), 'QA sign-in')
  const claims = JSON.parse(Buffer.from(data.session.access_token.split('.')[1], 'base64url').toString())
  assert.equal(claims.workspace_role, 'cameraman')
  return [...jar].map(([name, value]) => ({ name, value, url: base }))
}

async function startBrowser() {
  const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  browser = spawn(edge, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank',
  ], { windowsHide: true, stdio: 'ignore' })
  let endpoint
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json`)
      const pages = await response.json()
      endpoint = pages.find((page) => page.type === 'page')?.webSocketDebuggerUrl
      if (endpoint) break
    } catch { /* Wait for Edge startup. */ }
    await sleep(200)
  }
  assert.ok(endpoint, 'Edge remote debugger did not start')
  const ws = new WebSocket(endpoint)
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true })
    ws.addEventListener('error', reject, { once: true })
  })
  let nextId = 0
  const pending = new Map()
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (!message.id) return
    const waiter = pending.get(message.id)
    if (!waiter) return
    pending.delete(message.id)
    if (message.error) waiter.reject(new Error(message.error.message))
    else waiter.resolve(message.result)
  })
  connection = {
    send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = ++nextId
        pending.set(id, { resolve, reject })
        ws.send(JSON.stringify({ id, method, params }))
      })
    },
    close: () => ws.close(),
  }
  await connection.send('Page.enable')
  await connection.send('Network.enable')
  await connection.send('Runtime.enable')
  await connection.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
}

async function evaluate(expression) {
  const result = await connection.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
  return result.result.value
}

async function visit(url, expectedText) {
  await connection.send('Page.navigate', { url })
  for (let attempt = 0; attempt < 80; attempt++) {
    const ready = await evaluate(`document.body?.innerText?.includes(${JSON.stringify(expectedText)}) ?? false`).catch(() => false)
    if (ready) return
    await sleep(500)
  }
  throw new Error(`Page did not show ${expectedText}; URL=${await evaluate('location.href')}`)
}

async function cleanup() {
  const errors = []
  async function attempt(label, work) { try { await work() } catch (error) { errors.push(`${label}: ${error.message}`) } }
  connection?.close()
  if (browser) browser.kill()
  await sleep(500)
  await attempt('Edge profile', async () => {
    for (let retry = 0; retry < 10; retry++) {
      try { await rm(profile, { recursive: true, force: true }); return }
      catch (error) {
        if (error.code !== 'EBUSY' || retry === 9) throw error
        await sleep(500)
      }
    }
  })
  for (const shoot of assigned.reverse()) await attempt(`shoot ${shoot.id}`, async () => {
    const result = await db.query('update shoots set cameraman_id=$1 where id=$2 and cameraman_id=$3',
      [shoot.cameraman_id, shoot.id, qaId])
    assert.equal(result.rowCount, 1)
  })
  if (authId) await attempt('Auth identity', async () => { checked(await admin.auth.admin.deleteUser(authId), 'QA Auth deletion') })
  if (inserted) await attempt('workspace user', async () => { await db.query('delete from users where id=$1 and email=$2', [qaId, email]) })
  if (errors.length) throw new Error(`Browser QA cleanup incomplete: ${errors.join(' | ')}`)
  console.log('Browser QA cleanup complete: shoot assignments restored and test identity removed.')
}

await db.connect()
try {
  const selected = await db.query(`select id,title,agency_id,cameraman_id from shoots
    where title in ('Title of Sasuke','Basil Cafe — Sept menu') order by title`)
  assert.equal(selected.rowCount, 2)
  const testShoot = selected.rows.find((shoot) => shoot.title === 'Title of Sasuke')
  const pendingShoot = selected.rows.find((shoot) => shoot.title === 'Basil Cafe — Sept menu')
  assert.equal(testShoot.agency_id, pendingShoot.agency_id)
  if (!apply) {
    console.log('Dry run: would assign two seeded shoots to a temporary cameraman, cache them in Edge at 390px, go offline, verify saved schedule and queued mark across reload, then restore assignments.')
  } else {
    await db.query(`insert into users(id,agency_id,email,full_name,initials,role,avatar_gradient,is_active)
      values($1,$2,$3,'QA Cameraman','QC','cameraman','linear-gradient(135deg,#8172F3,#5340CE)',true)`,
    [qaId, testShoot.agency_id, email])
    inserted = true
    const created = checked(await admin.auth.admin.createUser({ email, password, email_confirm: true }), 'QA Auth creation')
    authId = created.user.id
    const cookies = await signInCookies()
    for (const shoot of [testShoot, pendingShoot]) {
      const result = await db.query('update shoots set cameraman_id=$1 where id=$2 and cameraman_id=$3',
        [qaId, shoot.id, shoot.cameraman_id])
      assert.equal(result.rowCount, 1)
      assigned.push(shoot)
    }
    await startBrowser()
    await connection.send('Network.setCookies', { cookies })
    await visit(`${base}/cameraman/shoots?shoot=${testShoot.id}`, 'Title of Sasuke')
    const layout = await evaluate(`({width:innerWidth,documentWidth:document.documentElement.scrollWidth,
      bodyWidth:document.body.scrollWidth,shootVisible:document.body.innerText.includes('Title of Sasuke')})`)
    assert.equal(layout.width, 390)
    assert.ok(layout.documentWidth <= 390 && layout.bodyWidth <= 390, `Cameraman layout overflowed: ${JSON.stringify(layout)}`)
    await visit(`${base}/cameraman/pending`, 'Basil Cafe — Sept menu')
    const pending = await evaluate(`({width:innerWidth,documentWidth:document.documentElement.scrollWidth,
      bodyWidth:document.body.scrollWidth,seededPending:document.body.innerText.includes('Basil Cafe — Sept menu')})`)
    assert.ok(pending.seededPending && pending.documentWidth <= 390 && pending.bodyWidth <= 390,
      `Pending page failed: ${JSON.stringify(pending)}`)
    await visit(`${base}/cameraman/shoots?shoot=${pendingShoot.id}`, 'Basil Cafe — Sept menu')
    for (let retry = 0; retry < 30; retry++) {
      if (await evaluate(`!!localStorage.getItem('offline:schedule:${qaId}')`)) break
      await sleep(250)
    }
    assert.ok(await evaluate(`!!localStorage.getItem('offline:schedule:${qaId}')`), 'Schedule saved per user')
    await evaluate('navigator.serviceWorker.ready.then(()=>!!navigator.serviceWorker.controller)')
    await connection.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 })
    await connection.send('Page.reload')
    for (let retry = 0; retry < 80; retry++) {
      if (await evaluate(`document.body?.innerText?.includes('Showing your saved schedule') ?? false`).catch(() => false)) break
      await sleep(500)
    }
    const offline = await evaluate(`({online:navigator.onLine,saved:document.body.innerText.includes('Showing your saved schedule'),
      shoot:document.body.innerText.includes('Basil Cafe'),disabled:document.body.innerText.includes('Needs a connection'),
      width:document.documentElement.scrollWidth})`)
    assert.ok(!offline.online && offline.saved && offline.shoot && offline.disabled && offline.width <= 390,
      `Offline schedule failed: ${JSON.stringify(offline)}`)
    await evaluate('window.confirm=()=>true')
    const markClicked = await evaluate(`(()=>{const button=document.querySelector('button[aria-label^="Mark raw uploaded for"]');button?.click();return !!button})()`)
    assert.ok(markClicked, 'Offline mark control exists')
    for (let retry = 0; retry < 30; retry++) {
      if (await evaluate(`document.body.innerText.includes('Queued')`)) break
      await sleep(250)
    }
    assert.ok(await evaluate(`document.body.innerText.includes('Queued')`), 'Offline mark is visibly queued')
    assert.equal(await evaluate(`JSON.parse(localStorage.getItem('offline:queue:${qaId}')??'[]').length`), 1)
    await connection.send('Page.reload')
    for (let retry = 0; retry < 80; retry++) {
      if (await evaluate(`document.body?.innerText?.includes('Queued') ?? false`).catch(() => false)) break
      await sleep(500)
    }
    assert.ok(await evaluate(`document.body.innerText.includes('Queued')`), 'Offline queue survives browser reload')
    console.log(`Phase 10 offline Edge pass: ${JSON.stringify(offline)}; queued mark survived reload. Reconnect sync remains a device check.`)
  }
} finally {
  try { if (apply) await cleanup() } finally { await db.end() }
}
