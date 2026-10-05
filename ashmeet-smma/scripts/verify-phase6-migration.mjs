/**
 * Applies 009_phase6_review.sql and exercises the review loop inside one transaction, then ALWAYS rolls back.
 * Needs TEST_DATABASE_URL. Run with: node --env-file=.env.local scripts/verify-phase6-migration.mjs
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
  await db.query(await readFile('supabase/migrations/009_phase6_review.sql', 'utf8'))

  const ctx = await one(`select c.id client_id, c.agency_id, c.manager_id, c.name client_name,
      (select id from users where agency_id = c.agency_id and role = 'admin' and is_active limit 1) admin_id,
      (select id from users where agency_id = c.agency_id and role = 'editor' and is_active limit 1) editor_id,
      (select id from users where agency_id = c.agency_id and role = 'brand_manager' and is_active and id <> c.manager_id limit 1) other_manager_id
    from clients c where c.manager_id is not null and exists (select 1 from users u where u.id = c.manager_id and u.role = 'brand_manager')
    limit 1`)
  assert.ok(ctx.admin_id && ctx.editor_id, 'seed has an admin and an editor in the agency')
  const { agency_id: agency, client_id: client, manager_id: manager, admin_id: admin, editor_id: editor } = ctx

  const itemId = `qa-p6-${randomUUID()}`
  await db.query(`insert into content_items(id,agency_id,client_id,title,slug,type,status,assigned_editor_id,created_by)
    values($1,$2,$3,'Phase 6 QA item',$4,'reel','cut_submitted',$5,$6)`, [itemId, agency, client, itemId, editor, manager])
  const addVersion = async (n) => {
    const id = `qa-v${n}-${randomUUID()}`
    await db.query(`insert into deliverable_versions(id,agency_id,content_item_id,version,b2_key,file_size_bytes,duration_seconds,uploaded_by,status)
      values($1,$2,$3,$4,$5,1048576,30,$6,'submitted')`, [id, agency, itemId, n, `${agency}/cuts/${itemId}/${id}.mp4`, editor])
    return id
  }
  const addComment = (versionId, body, voice = false) => db.query(
    `insert into comments(id,agency_id,version_id,author_id,author_label,timestamp_start,timestamp_end,body,voice_note_key,transcript_status,source)
     values(gen_random_uuid()::text,$1,$2,$3,'QA manager',11,14,$4,$5,$6,'internal')`,
    [agency, versionId, manager, body, voice ? `${agency}/voice-notes/${versionId}/x.webm` : null, voice ? 'pending' : null])
  const status = async () => (await one('select status from content_items where id=$1', [itemId])).status
  const versionStatus = async (id) => (await one('select status from deliverable_versions where id=$1', [id])).status
  const completeCut = async (n) => {
    const session = randomUUID()
    await db.query(`insert into media_upload_sessions(id,agency_id,kind,content_item_id,file_name,content_type,file_size_bytes,b2_key,b2_upload_id,uploader_id,state)
      values($1,$2,'cut',$3,'qa.mp4','video/mp4',1048576,$4,'qa',$5,'completing')`,
      [session, agency, itemId, `${agency}/cuts/${itemId}/${session}.mp4`, editor])
    return (await one('select phase5_complete_cut($1,$2,$3) v', [session, editor, 20])).v
  }

  const v1 = await addVersion(1)
  // Internal review permissions and the "needs a comment" rule
  await rejects('select phase6_review_decision($1,$2,$3)', [itemId, editor, 'approve'], /Forbidden/)
  if (ctx.other_manager_id) await rejects('select phase6_review_decision($1,$2,$3)', [itemId, ctx.other_manager_id, 'approve'], /Forbidden/)
  await rejects('select phase6_review_decision($1,$2,$3)', [itemId, manager, 'changes'], /at least one unresolved comment/)
  await addComment(v1, 'Opening text is cut off.')
  await db.query('select phase6_review_decision($1,$2,$3)', [itemId, manager, 'changes'])
  assert.equal(await status(), 'changes_requested')
  assert.equal(await versionStatus(v1), 'changes_requested')
  assert.equal((await one(`select count(*)::int n from notifications where user_id=$1 and link='/editor/redo' and body like 'Phase 6 QA item%'`, [editor])).n, 1)
  assert.equal((await one(`select count(*)::int n from activity_log where entity_id=$1 and to_state='changes_requested' and actor_id=$2`, [itemId, manager])).n, 1)

  // The editor resubmits straight from changes_requested; v1's comment must not block or count for v2
  const v2 = await completeCut(2)
  assert.equal(await status(), 'cut_submitted')
  assert.equal(v2.version, 2)
  await rejects('select phase6_review_decision($1,$2,$3)', [itemId, manager, 'changes'], /at least one unresolved comment/)
  await rejects('select phase6_create_link($1,$2,$3,$4)', [itemId, manager, 'h1', 'p1'], /internally approved/)
  await db.query('select phase6_review_decision($1,$2,$3)', [itemId, admin, 'approve'])
  assert.equal(await status(), 'internally_approved')
  assert.equal(await versionStatus(v2.id), 'internally_approved')

  // Link generation, scoping, regeneration
  const first = (await one('select phase6_create_link($1,$2,$3,$4) l', [itemId, manager, 'tokhash-1', 's1$aa$bb'])).l
  assert.equal(await status(), 'with_client')
  assert.equal(first.version_id, v2.id)
  const link1 = await one('select * from approval_links where id=$1', [first.id])
  assert.ok(Math.abs(new Date(link1.expires_at) - Date.now() - 7 * 864e5) < 60e3, 'expires in 7 days')
  assert.ok(![link1.token_hash, link1.pin_hash].some((value) => /^\d{4}$/.test(value)))
  const second = (await one('select phase6_create_link($1,$2,$3,$4) l', [itemId, manager, 'tokhash-2', 's1$cc$dd'])).l
  assert.ok((await one('select revoked_at from approval_links where id=$1', [first.id])).revoked_at, 'regeneration revokes the previous link')
  assert.equal((await one('select count(*)::int n from approval_links where content_item_id=$1 and revoked_at is null', [itemId])).n, 1)

  // PIN attempts lock after five failures, even when a later guess is correct
  for (let i = 1; i <= 4; i++) assert.equal((await one('select phase6_pin_attempt($1,false) r', [second.id])).r.locked, false)
  assert.equal((await one('select phase6_pin_attempt($1,false) r', [second.id])).r.locked, true)
  assert.equal((await one('select phase6_pin_attempt($1,true) r', [second.id])).r.locked, true)
  await rejects('select phase6_client_respond($1,$2,$3)', [second.id, 'approved', null], /locked/)

  // Views log with IP and user agent; viewed_at sets once
  const third = (await one('select phase6_create_link($1,$2,$3,$4) l', [itemId, manager, 'tokhash-3', 's1$ee$ff'])).l
  await db.query('select phase6_record_view($1,$2,$3)', [third.id, '203.0.113.9', 'QA phone'])
  const firstView = (await one('select viewed_at from approval_links where id=$1', [third.id])).viewed_at
  await db.query('select phase6_record_view($1,$2,$3)', [third.id, '203.0.113.9', 'QA phone'])
  assert.equal((await one('select count(*)::int n from approval_link_views where link_id=$1', [third.id])).n, 2)
  assert.equal(String((await one('select viewed_at from approval_links where id=$1', [third.id])).viewed_at), String(firstView))

  // Expired and revoked links cannot respond
  await db.query(`update approval_links set expires_at = now() - interval '1 minute' where id=$1`, [third.id])
  await rejects('select phase6_client_respond($1,$2,$3)', [third.id, 'approved', null], /expired/)
  await rejects('select phase6_client_respond($1,$2,$3)', [first.id, 'approved', null], /revoked/)
  await db.query(`update approval_links set expires_at = now() + interval '7 days' where id=$1`, [third.id])

  // Client requests changes: verbatim text, item to client_changes, manager and editor notified, actor_type client
  await rejects('select phase6_client_respond($1,$2,$3)', [third.id, 'changes', '   '], /text_required/)
  const words = '  Make the logo bigger,\nand — please — keep the "tagline" at 0:12.  '
  await db.query('select phase6_client_respond($1,$2,$3)', [third.id, 'changes', words])
  const clientComment = await one(`select body,source,author_id,author_label from comments where version_id=$1 and source='client'`, [v2.id])
  assert.equal(clientComment.body, words)
  assert.equal(clientComment.author_id, null)
  assert.equal(await status(), 'client_changes')
  assert.equal(await versionStatus(v2.id), 'changes_requested')
  assert.equal((await one(`select count(*)::int n from activity_log where entity_id=$1 and actor_type='client' and to_state='client_changes'`, [itemId])).n, 1)
  assert.equal((await one(`select count(*)::int n from notifications where user_id=$1 and title='Client requested changes'`, [manager])).n, 1)
  await rejects('select phase6_client_respond($1,$2,$3)', [third.id, 'approved', null], /responded/)

  // Revision from client_changes, approval, client approves, then the item is reopened
  const v3 = await completeCut(3)
  assert.equal(v3.version, 3)
  await db.query('select phase6_review_decision($1,$2,$3)', [itemId, manager, 'approve'])
  const fourth = (await one('select phase6_create_link($1,$2,$3,$4) l', [itemId, manager, 'tokhash-4', 's1$gg$hh'])).l
  await db.query('select phase6_client_respond($1,$2,$3)', [fourth.id, 'approved', null])
  assert.equal(await status(), 'client_approved')
  assert.equal(await versionStatus(v3.id), 'client_approved')
  assert.equal((await one(`select response from approval_links where id=$1`, [fourth.id])).response, 'approved')
  await rejects('select phase6_reopen_item($1,$2,$3)', [itemId, editor, 'x'], /Forbidden/)
  await rejects('select phase6_reopen_item($1,$2,$3)', [itemId, manager, '  '], /Describe the change/)
  await db.query('select phase6_reopen_item($1,$2,$3)', [itemId, manager, 'Client called: swap the music.'])
  assert.equal(await status(), 'client_changes')
  assert.equal((await one(`select count(*)::int n from comments where version_id=$1 and body like 'Client called%'`, [v3.id])).n, 1)

  // Revoke
  await db.query(`update content_items set status='internally_approved' where id=$1`, [itemId])
  await db.query(`update deliverable_versions set status='internally_approved' where id=$1`, [v3.id])
  await db.query('select phase6_create_link($1,$2,$3,$4)', [itemId, manager, 'tokhash-5', 's1$ii$jj'])
  await db.query('select phase6_revoke_link($1,$2)', [itemId, manager])
  await rejects('select phase6_revoke_link($1,$2)', [itemId, manager], /no active link/)

  // Hashes are never readable by API roles
  const grants = await db.query(`select has_column_privilege('authenticated','approval_links','token_hash','select') t,
    has_column_privilege('authenticated','approval_links','pin_hash','select') p`)
  assert.deepEqual(grants.rows[0], { t: false, p: false })
  console.log('Phase 6 rollback check passed: review rules, revision loop, links, PIN lock, views, client responses, reopen, revoke.')
} finally {
  if (began) await db.query('rollback')
  await db.end()
}
