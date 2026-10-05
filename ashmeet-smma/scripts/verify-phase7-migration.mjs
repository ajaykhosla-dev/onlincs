/**
 * Applies 010_phase7_posting.sql and exercises scheduling, editing, posting and undo inside one
 * transaction, then ALWAYS rolls back. Run with: node --env-file=.env.local scripts/verify-phase7-migration.mjs
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
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
  await db.query(await readFile('supabase/migrations/010_phase7_posting.sql', 'utf8'))

  const ctx = await one(`select c.id client_id, c.agency_id, c.manager_id,
      (select id from users where agency_id = c.agency_id and role = 'admin' and is_active limit 1) admin_id,
      (select id from users where agency_id = c.agency_id and role = 'editor' and is_active limit 1) editor_id,
      (select id from users where agency_id = c.agency_id and role = 'brand_manager' and is_active and id <> c.manager_id limit 1) other_manager_id
    from clients c where c.manager_id is not null and exists (select 1 from users u where u.id = c.manager_id and u.role = 'brand_manager') limit 1`)
  const { agency_id: agency, client_id: client, manager_id: manager, admin_id: admin, editor_id: editor } = ctx
  const newItem = async (status) => {
    const id = `qa-p7-${randomUUID()}`
    await db.query(`insert into content_items(id,agency_id,client_id,title,slug,type,status,planned_date,created_by)
      values($1,$2,$3,'Phase 7 QA item',$1,'reel',$4,'2026-10-10',$5)`, [id, agency, client, status, manager])
    return id
  }
  const status = async (id) => (await one('select status from content_items where id=$1', [id])).status
  const delivered = async () => (await one(`select count(*)::int n from content_items where client_id=$1 and status='posted'
    and planned_date >= '2026-10-01' and planned_date < '2026-11-01'`, [client])).n
  const past = new Date(Date.now() - 3 * 864e5).toISOString()

  // Scheduling: wrong status names the status, wrong people are refused
  const early = await newItem('with_editor')
  await rejects('select phase7_schedule_post($1,$2,$3,$4,$5)', [early, manager, past, 'x', ''], /client-approved item can be scheduled.*with editor/)
  const item = await newItem('client_approved')
  await rejects('select phase7_schedule_post($1,$2,$3,$4,$5)', [item, editor, past, 'x', ''], /Forbidden/)
  if (ctx.other_manager_id) await rejects('select phase7_schedule_post($1,$2,$3,$4,$5)', [item, ctx.other_manager_id, past, 'x', ''], /Forbidden/)
  const longCaption = `${'Line one of a long caption.\n'.repeat(120)}The end`
  assert.ok(longCaption.length > 2000)
  const post = (await one('select phase7_schedule_post($1,$2,$3,$4,$5) p', [item, manager, past, longCaption, '  trending-audio-07 '])).p
  assert.equal(await status(item), 'scheduled')
  assert.equal(post.caption, longCaption, 'a multi-line caption over 2,000 characters is stored intact')
  assert.equal(post.bg_music_ref, 'trending-audio-07')
  assert.equal(new Date(post.scheduled_at).toISOString(), past)
  await rejects('select phase7_schedule_post($1,$2,$3,$4,$5)', [item, manager, past, 'x', ''], /Only a client-approved item|already has a post/)
  assert.equal((await one(`select count(*)::int n from activity_log where entity_id=$1 and to_state='scheduled' and actor_id=$2`, [item, manager])).n, 1)

  // Editing before posting
  const later = new Date(Date.now() + 2 * 864e5).toISOString()
  const edited = (await one('select phase7_update_post($1,$2,$3,$4,$5) p', [post.id, admin, later, 'New caption', ''])).p
  assert.equal(edited.caption, 'New caption'); assert.equal(edited.bg_music_ref, null)
  assert.equal(new Date(edited.scheduled_at).toISOString(), later)
  await rejects('select phase7_update_post($1,$2,$3,$4,$5)', [post.id, editor, later, 'x', ''], /Forbidden/)
  await db.query('select phase7_update_post($1,$2,$3,$4,$5)', [post.id, manager, past, 'New caption', 'song'])

  // Overdue: past time, unposted
  const overdue = async () => (await db.query(`select id from post_schedule where agency_id=$1 and posted_at is null and scheduled_at < now()`, [agency])).rows.map((row) => row.id)
  assert.ok((await overdue()).includes(post.id))

  // Mark posted (a post dated three days ago is fine): fields, status, log, delivered +1 exactly
  const before = await delivered()
  await rejects('select phase7_mark_posted($1,$2)', [post.id, editor], /Forbidden/)
  const posted = (await one('select phase7_mark_posted($1,$2) p', [post.id, manager])).p
  assert.ok(posted.posted_at); assert.equal(posted.posted_by, manager)
  assert.equal(await status(item), 'posted')
  assert.equal(await delivered(), before + 1)
  assert.ok(!(await overdue()).includes(post.id), 'marking posted removes it from overdue')
  assert.equal((await one(`select count(*)::int n from activity_log where entity_id=$1 and to_state='posted' and actor_id=$2`, [item, manager])).n, 1)
  await rejects('select phase7_mark_posted($1,$2)', [post.id, manager], /already marked posted/)
  await rejects('select phase7_update_post($1,$2,$3,$4,$5)', [post.id, manager, later, 'x', ''], /already marked posted/)

  // Undo within 24 hours, logged
  await db.query('select phase7_unmark_posted($1,$2)', [post.id, manager])
  assert.equal(await status(item), 'scheduled')
  assert.equal(await delivered(), before)
  const reversal = await one(`select metadata from activity_log where entity_id=$1 and action='post_unmarked'`, [item])
  assert.equal(reversal.metadata.reversal, true)
  const row = await one('select posted_at, posted_by from post_schedule where id=$1', [post.id])
  assert.deepEqual(row, { posted_at: null, posted_by: null })

  // Undo after 24 hours is blocked
  await db.query('select phase7_mark_posted($1,$2)', [post.id, admin])
  await db.query(`update post_schedule set posted_at = now() - interval '25 hours' where id=$1`, [post.id])
  await rejects('select phase7_unmark_posted($1,$2)', [post.id, manager], /within 24 hours/)
  assert.equal(await status(item), 'posted')

  // One post per item
  await rejects(`insert into post_schedule(id,agency_id,content_item_id,scheduled_at) values(gen_random_uuid()::text,$1,$2,now())`, [agency, item], /uq_post_schedule_item|duplicate key/)

  const grants = await one(`select has_function_privilege('authenticated','phase7_mark_posted(text,text)','execute') a`)
  assert.equal(grants.a, false)
  console.log('Phase 7 rollback check passed: scheduling, status message, long caption, edit, overdue, mark posted (+1 delivered), 24h undo, block after 24h, one post per item.')
} finally {
  if (began) await db.query('rollback')
  await db.end()
}
