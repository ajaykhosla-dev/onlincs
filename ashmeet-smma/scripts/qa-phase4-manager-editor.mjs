/** Temporary live manager/editor role QA. Dry-run by default. */
import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

const apply = process.argv.includes('--apply')
const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL, ssl: { rejectUnauthorized: false } })
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } })
const roles = ['brand_manager', 'editor']
const people = roles.map((role) => ({ role, id: randomUUID(), email: `qa-${role}-${randomUUID().slice(0, 10)}@example.invalid`,
  password: randomBytes(32).toString('base64url'), authId: null, inserted: false }))
let target, oldManager, oldEditor, managerAssigned = false, editorAssigned = false

function checked(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`)
  return result.data
}

async function signIn(person) {
  const jar = new Map()
  const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (items) => items.forEach(({ name, value }) => jar.set(name, value)),
    },
  })
  const data = checked(await client.auth.signInWithPassword({ email: person.email, password: person.password }), 'QA sign-in')
  const claims = JSON.parse(Buffer.from(data.session.access_token.split('.')[1], 'base64url').toString())
  assert.equal(claims.workspace_user_id, person.id)
  assert.equal(claims.workspace_role, person.role)
  return [...jar].map(([name, value]) => `${name}=${encodeURIComponent(value)}`).join('; ')
}

async function get(path, cookie) {
  const response = await fetch(`http://localhost:3000${path}`, {
    headers: { Cookie: cookie }, redirect: 'manual', signal: AbortSignal.timeout(60000),
  })
  const contentType = response.headers.get('content-type') ?? ''
  const body = contentType.includes('application/json') ? await response.json() : await response.text()
  return { status: response.status, body, location: response.headers.get('location') }
}

async function cleanup() {
  const errors = []
  async function attempt(label, work) { try { await work() } catch (error) { errors.push(`${label}: ${error.message}`) } }
  if (editorAssigned) await attempt('editor assignment', async () => {
    const result = await db.query('update content_items set assigned_editor_id=$1 where id=$2 and assigned_editor_id=$3',
      [oldEditor, target.content_item_id, people[1].id])
    assert.equal(result.rowCount, 1)
  })
  if (managerAssigned) await attempt('client manager', async () => {
    const result = await db.query('update clients set manager_id=$1 where id=$2 and manager_id=$3',
      [oldManager, target.client_id, people[0].id])
    assert.equal(result.rowCount, 1)
  })
  for (const person of [...people].reverse()) {
    if (person.authId) await attempt(`${person.role} Auth`, async () => {
      checked(await admin.auth.admin.deleteUser(person.authId), 'QA Auth deletion')
    })
    if (person.inserted) await attempt(`${person.role} workspace row`, async () => {
      await db.query('delete from users where id=$1 and email=$2', [person.id, person.email])
    })
  }
  if (errors.length) throw new Error(`Manager/editor QA cleanup incomplete: ${errors.join(' | ')}`)
  console.log('Manager/editor QA cleanup complete: client and idea assignments restored; QA identities removed.')
}

await db.connect()
try {
  const selected = await db.query(`select s.id as shoot_id,s.agency_id,s.client_id,c.manager_id,
    ci.id as content_item_id,ci.assigned_editor_id
    from shoots s join clients c on c.id=s.client_id
    join shoot_items si on si.shoot_id=s.id join content_items ci on ci.id=si.content_item_id
    join raw_files r on r.shoot_id=s.id and r.content_item_id=ci.id
    where s.title='Title of Sasuke' and r.file_name='sample-5s.mp4' limit 1`)
  assert.equal(selected.rowCount, 1)
  target = selected.rows[0]
  oldManager = target.manager_id
  oldEditor = target.assigned_editor_id
  const other = await db.query(`select s.id from shoots s where s.agency_id=$1 and s.client_id<>$2 order by s.id limit 1`,
    [target.agency_id, target.client_id])
  assert.equal(other.rowCount, 1)
  if (!apply) {
    console.log('Dry run: would create temporary manager/editor identities, assign one test client and one file-bearing idea, verify role pages and API scoping, then restore all assignments.')
  } else {
    for (const person of people) {
      await db.query(`insert into users(id,agency_id,email,full_name,initials,role,avatar_gradient,is_active)
        values($1,$2,$3,$4,$5,$6,'linear-gradient(135deg,#8172F3,#5340CE)',true)`,
      [person.id, target.agency_id, person.email, `QA ${person.role}`, person.role === 'editor' ? 'QE' : 'QM', person.role])
      person.inserted = true
      const created = checked(await admin.auth.admin.createUser({ email: person.email, password: person.password, email_confirm: true }), 'QA Auth creation')
      person.authId = created.user.id
      const linked = await db.query('select auth_user_id from users where id=$1', [person.id])
      assert.equal(linked.rows[0].auth_user_id, person.authId)
    }
    const managerUpdate = await db.query('update clients set manager_id=$1 where id=$2 and manager_id=$3',
      [people[0].id, target.client_id, oldManager])
    assert.equal(managerUpdate.rowCount, 1)
    managerAssigned = true
    const editorUpdate = await db.query('update content_items set assigned_editor_id=$1 where id=$2 and assigned_editor_id is not distinct from $3',
      [people[1].id, target.content_item_id, oldEditor])
    assert.equal(editorUpdate.rowCount, 1)
    editorAssigned = true

    const managerCookie = await signIn(people[0])
    const managerPage = await get('/manager/calendar', managerCookie)
    assert.equal(managerPage.status, 200)
    const managerShoots = await get('/api/shoots', managerCookie)
    assert.equal(managerShoots.status, 200)
    assert.ok(managerShoots.body.shoots.some((shoot) => shoot.id === target.shoot_id))
    assert.ok(managerShoots.body.shoots.every((shoot) => shoot.client.id === target.client_id))
    assert.equal((await get(`/api/shoots/${other.rows[0].id}`, managerCookie)).status, 403)
    const managerAdmin = await get('/admin/calendar', managerCookie)
    assert.ok(managerAdmin.status >= 300 && managerAdmin.location?.includes('/403'))
    console.log('Manager passed: calendar loads, only assigned client shoots are returned, other client shoot returns 403, admin page blocked.')

    const editorCookie = await signIn(people[1])
    const rawPage = await get('/editor/raw', editorCookie)
    assert.equal(rawPage.status, 200)
    assert.ok(rawPage.body.includes('sample-5s.mp4') && rawPage.body.includes('New arrival announcement'))
    assert.ok(rawPage.body.includes('needs read access to the agency Shared Drive'))
    const editorShoots = await get('/api/shoots', editorCookie)
    assert.equal(editorShoots.status, 200)
    assert.ok(editorShoots.body.shoots.some((shoot) => shoot.id === target.shoot_id))
    assert.ok(editorShoots.body.shoots.every((shoot) => shoot.ideas.some((idea) => idea.content_item_id === target.content_item_id)))
    assert.equal((await get(`/api/shoots/${other.rows[0].id}`, editorCookie)).status, 403)
    const editorManager = await get('/manager/calendar', editorCookie)
    assert.ok(editorManager.status >= 300 && editorManager.location?.includes('/403'))
    console.log('Editor passed: assigned raw file and Drive-access note render; unassigned shoot returns 403; manager page blocked.')
  }
} finally {
  try { if (apply) await cleanup() } finally { await db.end() }
}
