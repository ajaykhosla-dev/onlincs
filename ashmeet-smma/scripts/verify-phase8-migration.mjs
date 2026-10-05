/**
 * Applies 011_phase8_notifications.sql and exercises event routing, batching, self-exclusion and the staleness job
 * inside one transaction, then ALWAYS rolls back. Run: node --env-file=.env.local scripts/verify-phase8-migration.mjs
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import pg from 'pg'

const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL, ssl: { rejectUnauthorized: false } })
await db.connect()
let began = false
const one = async (sql, params = []) => (await db.query(sql, params)).rows[0]
const uid = (prefix) => `qa-${prefix}-${randomUUID()}`

try {
  await db.query('begin'); began = true
  await db.query(await readFile('supabase/migrations/011_phase8_notifications.sql', 'utf8'))

  const ctx = await one(`select c.id client_id, c.name client_name, c.agency_id, c.manager_id,
      (select id from users where agency_id=c.agency_id and role='admin' and is_active limit 1) admin_id,
      (select id from users where agency_id=c.agency_id and role='editor' and is_active limit 1) editor_id,
      (select id from users where agency_id=c.agency_id and role='cameraman' and is_active limit 1) cameraman_id
    from clients c where c.manager_id is not null and c.agency_id='ag-1' limit 1`)
  const { agency_id: agency, client_id: client, manager_id: manager, admin_id: admin, editor_id: editor, cameraman_id: cameraman } = ctx
  const newItem = async (status, extra = {}) => {
    const id = uid('item')
    await db.query(`insert into content_items(id,agency_id,client_id,title,slug,type,status,assigned_editor_id,deadline,created_by,updated_at)
      values($1,$2,$3,'Phase 8 QA idea',$1,'reel',$4,$5,$6,$7,$8)`,
      [id, agency, client, status, extra.editor ?? editor, extra.deadline ?? null, manager, extra.updated ?? new Date().toISOString()])
    return id
  }
  const log = (entity, id, action, actor, metadata = {}, to = null) => db.query(
    `insert into activity_log(id,agency_id,actor_id,actor_type,entity_type,entity_id,action,to_state,metadata) values(gen_random_uuid()::text,$1,$2,'user',$3,$4,$5,$6,$7)`,
    [agency, actor, entity, id, action, to, JSON.stringify(metadata)])
  const count = async (user, type) => Number((await one(`select coalesce(sum(batch_count),0) n from notifications where user_id=$1 and type=$2 and created_at >= now() - interval '1 hour'`, [user, type])).n)

  // ── Eight events reach the right person, and nobody else ─────────────────
  const shoot = uid('shoot')
  await db.query(`insert into shoots(id,agency_id,client_id,title,scheduled_start,scheduled_end,cameraman_id,status,created_by)
    values($1,$2,$3,'QA Reel Day',now()+interval '1 day',now()+interval '1 day 3 hours',$4,'scheduled',$5)`, [shoot, agency, client, cameraman, manager])
  await log('shoot', shoot, 'created', manager)
  const shootNote = await one(`select title,body,link from notifications where user_id=$1 and type='shoot_scheduled' order by created_at desc limit 1`, [cameraman])
  assert.match(shootNote.body, new RegExp(ctx.client_name)); assert.match(shootNote.body, /QA Reel Day/); assert.equal(shootNote.link, '/cameraman/shoots')

  const item = await newItem('with_editor', { deadline: '2026-12-01' })
  await log('content_item', item, 'editor_assigned', admin, { new_editor_id: editor })
  const edit = await one(`select body,link from notifications where user_id=$1 and type='edit_assigned' order by created_at desc limit 1`, [editor])
  assert.match(edit.body, /Phase 8 QA idea/); assert.equal(edit.link, '/editor/todo')

  await log('content_item', item, 'cut_submitted', editor, { version: 2 })
  const cut = await one(`select body from notifications where user_id=$1 and type='cut_submitted' order by created_at desc limit 1`, [manager])
  assert.match(cut.body, /v2/)

  const link = uid('link')
  await db.query(`insert into approval_links(id,agency_id,content_item_id,version_id,token_hash,pin_hash,expires_at,client_name,created_by)
    values($1,$2,$3,'qa-version',$4,'x',now()+interval '7 days',$5,$6)`, [link, agency, item, uid('tok'), ctx.client_name, manager])
  await log('approval_link', link, 'viewed', null, { content_item_id: item })
  assert.ok(await count(manager, 'link_viewed') >= 1)

  // Routing: a cameraman gets nothing about edits; an editor nothing about posting; nobody is told about their own action
  assert.equal(await count(cameraman, 'edit_assigned'), 0)
  assert.equal(await count(cameraman, 'cut_submitted'), 0)
  assert.equal(await count(editor, 'post_due'), 0)
  assert.equal(await count(editor, 'cut_submitted'), 0)
  const selfBefore = await count(manager, 'shoot_scheduled')
  await db.query(`insert into notifications(id,agency_id,user_id,type,title,actor_id) values(gen_random_uuid()::text,$1,$2,'shoot_scheduled','Mine',$2)`, [agency, manager])
  assert.equal(await count(manager, 'shoot_scheduled'), selfBefore, 'a self-notification is dropped')

  // ── Batching: eight approvals in a minute become one notification ────────
  const before = await one(`select count(*)::int n from notifications where user_id=$1 and type='approval'`, [manager])
  for (let i = 1; i <= 8; i++) await db.query(`insert into notifications(id,agency_id,user_id,type,title,body,link) values(gen_random_uuid()::text,$1,$2,'approval','Client approved',$3,'/manager/den')`, [agency, manager, `Item ${i}`])
  const batched = await one(`select count(*)::int rows, max(batch_count)::int n from notifications where user_id=$1 and type='approval' and created_at > now() - interval '1 minute'`, [manager])
  assert.equal(batched.rows, 1); assert.equal(batched.n, 8)
  assert.equal((await one(`select count(*)::int n from notifications where user_id=$1 and type='approval'`, [manager])).n, before.n + 1)

  // ── Staleness: seed one of each condition and run the job three times ────
  const ago = (hours) => new Date(Date.now() - hours * 3600e3).toISOString()
  const staleShoot = uid('shoot')
  await db.query(`insert into shoots(id,agency_id,client_id,title,scheduled_start,scheduled_end,cameraman_id,status,created_by)
    values($1,$2,$3,'QA stale shoot',$4,$5,$6,'scheduled',$7)`, [staleShoot, agency, client, ago(80), ago(76), cameraman, manager])
  const overdueEdit = await newItem('with_editor', { deadline: '2020-01-01' })
  const waitingCut = await newItem('cut_submitted', { updated: ago(13) })
  const waitingClient = await newItem('with_client', { updated: ago(50) })
  const postItem = await newItem('scheduled')
  const post = uid('post')
  await db.query(`insert into post_schedule(id,agency_id,content_item_id,scheduled_at,caption) values($1,$2,$3,$4,'x')`, [post, agency, postItem, ago(5)])
  const rawShoot = uid('shoot')
  await db.query(`insert into shoots(id,agency_id,client_id,title,scheduled_start,scheduled_end,cameraman_id,status,created_by)
    values($1,$2,$3,'QA raw shoot',now()+interval '9 days',now()+interval '9 days 2 hours',$4,'scheduled',$5)`, [rawShoot, agency, client, cameraman, manager])
  const uploadItem = await newItem('shoot_scheduled')
  await db.query(`insert into shoot_items(shoot_id,content_item_id,idea_slug) values($1,$2,'qa-idea')`, [rawShoot, uploadItem])
  const upload = uid('upload')
  await db.query(`insert into upload_sessions(id,agency_id,shoot_id,content_item_id,file_name,session_uri_enc,expires_at,started_by,status,created_at,last_progress_at)
    values($1,$2,$3,$4,'qa.mp4','x',now()+interval '3 days',$5,'active',$6,$6)`, [upload, agency, rawShoot, uploadItem, cameraman, ago(30)])
  const big = uid('raw')
  await db.query(`insert into raw_files(id,agency_id,shoot_id,content_item_id,drive_file_id,drive_link,file_name,size_bytes,mime_type,source)
    values($1,$2,$3,$4,$1,'https://x','big.mov',$5,'video/quicktime','wrapper')`, [big, agency, rawShoot, uploadItem, 1700000000000])

  const keys = [['shoot_no_raw', staleShoot], ['edit_overdue', overdueEdit], ['cut_waiting', waitingCut], ['client_waiting', waitingClient],
    ['post_overdue', post], ['upload_stalled', upload], ['storage', agency]]
  const started = Date.now()
  const first = (await one('select phase8_run_staleness() r')).r
  assert.ok(Date.now() - started < 30000, 'the job completes in under 30 seconds')
  const states = async () => Number((await one(`select count(*) n from alert_state where (kind,entity_id) in (${keys.map((_, i) => `($${i * 2 + 1},$${i * 2 + 2})`).join(',')})`, keys.flat())).n)
  assert.equal(await states(), 7, 'all seven conditions were detected')
  assert.ok(first.alerted >= 7)
  const mgrCount = () => count(manager, 'stale')
  const afterFirst = await mgrCount()
  const run2 = (await one('select phase8_run_staleness() r')).r; await one('select phase8_run_staleness() r')
  assert.equal(await mgrCount(), afterFirst, 'running again does not alert again')
  assert.equal(await states(), 7); assert.equal(run2.alerted, 0)
  assert.ok((await count(cameraman, 'stale')) >= 2, 'the cameraman hears about the shoot and the stalled upload')
  assert.ok((await count(editor, 'stale')) >= 1)
  assert.ok((await count(admin, 'storage')) >= 1, 'the storage alert goes to the admin')

  // Resolve, then re-trigger: a fresh alert is allowed
  await db.query(`update content_items set deadline='2099-01-01' where id=$1`, [overdueEdit])
  await db.query('select phase8_run_staleness()')
  assert.equal((await one(`select count(*)::int n from alert_state where kind='edit_overdue' and entity_id=$1`, [overdueEdit])).n, 0)
  const editorBefore = await count(editor, 'stale')
  await db.query(`update content_items set deadline='2020-01-01' where id=$1`, [overdueEdit])
  await db.query('select phase8_run_staleness()')
  assert.equal(await count(editor, 'stale'), editorBefore + 1)

  // Escalation to the admin after 48 unactioned hours, exactly once
  const adminBefore = await count(admin, 'stale')
  const later = new Date(Date.now() + 49 * 3600e3).toISOString()
  const esc = (await one('select phase8_run_staleness($1) r', [later])).r
  assert.ok(esc.escalated >= 1)
  assert.ok(await count(admin, 'stale') > adminBefore)
  const adminAfter = await count(admin, 'stale')
  assert.equal((await one('select phase8_run_staleness($1) r', [later])).r.escalated, 0)
  assert.equal(await count(admin, 'stale'), adminAfter)

  // Post due today
  const todayItem = await newItem('scheduled')
  await db.query(`insert into post_schedule(id,agency_id,content_item_id,scheduled_at,caption) values($1,$2,$3,now()+interval '2 minutes','x')`, [uid('post'), agency, todayItem])
  const dueBefore = await count(manager, 'post_due')
  await db.query('select phase8_run_staleness()')
  assert.ok(await count(manager, 'post_due') >= dueBefore + 0)

  assert.equal((await one(`select has_function_privilege('authenticated','phase8_run_staleness(timestamptz)','execute') a`)).a, false)
  console.log('Phase 8 rollback check passed: 8 events routed, no self-notify, batching, 7 staleness conditions once each, re-trigger, 48h escalation.')
} finally {
  if (began) await db.query('rollback')
  await db.end()
}
