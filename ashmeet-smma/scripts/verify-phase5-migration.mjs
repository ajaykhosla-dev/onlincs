/** Apply Phase 5 SQL and exercise core transitions inside a transaction, then always roll it back. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import pg from 'pg'

const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL, ssl: { rejectUnauthorized: false } })
await db.connect()
let began = false
try {
  await db.query('begin')
  began = true
  await db.query(await readFile('supabase/migrations/008_phase5_editor_media.sql','utf8'))
  const people = await db.query(`select a.id admin_id,a.agency_id,e.id editor_id from users a
    join users e on e.agency_id=a.agency_id and e.role='editor' and e.is_active
    where a.role='admin' and a.is_active limit 1`)
  assert.equal(people.rowCount,1)
  const { admin_id: adminId, agency_id: agencyId, editor_id: editorId } = people.rows[0]
  const item = await db.query('select id,client_id from content_items where agency_id=$1 limit 1',[agencyId])
  assert.equal(item.rowCount,1)
  const itemId = item.rows[0].id
  await db.query(`update content_items set status='planned' where id=$1`,[itemId])
  const otherManager = await db.query(`select u.id from users u join clients c on c.id=$1
    where u.agency_id=$2 and u.role='brand_manager' and u.is_active and u.id<>c.manager_id limit 1`,
    [item.rows[0].client_id,agencyId])
  if (otherManager.rowCount) {
    await db.query('savepoint deny_manager')
    await assert.rejects(db.query('select phase5_assign_editor($1,$2,$3,$4)',
      [itemId,editorId,'2026-10-20',otherManager.rows[0].id]),/Forbidden/)
    await db.query('rollback to savepoint deny_manager')
  }
  await db.query('savepoint deny_status')
  await assert.rejects(db.query('select phase5_assign_editor($1,$2,$3,$4)',
    [itemId,editorId,'2026-10-20',adminId]),/not ready for editor assignment/)
  await db.query('rollback to savepoint deny_status')
  const before = await db.query('select coalesce(max(version),0)::int as version from deliverable_versions where content_item_id=$1',[itemId])
  const firstVersion = before.rows[0].version+1
  await db.query('update content_items set status=$1 where id=$2',['raw_uploaded',itemId])
  const deadline = '2026-10-20'
  const assigned = await db.query('select phase5_assign_editor($1,$2,$3,$4) as value',[itemId,editorId,deadline,adminId])
  assert.equal(assigned.rows[0].value.status,'with_editor')
  assert.equal(assigned.rows[0].value.assigned_editor_id,editorId)
  const others = await db.query(`select id from users where agency_id=$1 and role='editor' and is_active and id<>$2 limit 1`,[agencyId,editorId])
  assert.equal(others.rowCount,1)
  const reassignedTo = others.rows[0].id
  await db.query('select phase5_assign_editor($1,$2,$3,$4)',[itemId,reassignedTo,deadline,adminId])
  const reassignment = await db.query(`select metadata from activity_log where entity_id=$1 and action='editor_assigned'
    and metadata->>'new_editor_id'=$2 order by created_at desc limit 1`,[itemId,reassignedTo])
  assert.equal(reassignment.rows[0].metadata.old_editor_id,editorId)
  assert.equal(reassignment.rows[0].metadata.new_editor_id,reassignedTo)
  const sessionId = randomUUID()
  await db.query(`insert into media_upload_sessions(id,agency_id,kind,content_item_id,file_name,content_type,file_size_bytes,b2_key,b2_upload_id,uploader_id)
    values($1,$2,'cut',$3,'qa.mp4','video/mp4',1048576,$4,$5,$6)`,
    [sessionId,agencyId,itemId,`${agencyId}/cuts/${itemId}/${sessionId}.mp4`,'rollback-qa',reassignedTo])
  await db.query(`update media_upload_sessions set state='completing' where id=$1`,[sessionId])
  const completed = await db.query('select phase5_complete_cut($1,$2,$3) as value',[sessionId,reassignedTo,12])
  assert.equal(completed.rows[0].value.version,firstVersion)
  const replay = await db.query('select phase5_complete_cut($1,$2,$3) as value',[sessionId,reassignedTo,12])
  assert.equal(replay.rows[0].value.id,completed.rows[0].value.id)
  const status = await db.query('select status from content_items where id=$1',[itemId])
  assert.equal(status.rows[0].status,'cut_submitted')
  await db.query(`update content_items set status='changes_requested' where id=$1`,[itemId])
  const latest = await db.query('select status from deliverable_versions where id=$1',[completed.rows[0].value.id])
  assert.equal(latest.rows[0].status,'changes_requested')
  await db.query('select phase5_assign_editor($1,$2,$3,$4)',[itemId,reassignedTo,deadline,adminId])
  const secondId = randomUUID()
  await db.query(`insert into media_upload_sessions(id,agency_id,kind,content_item_id,file_name,content_type,file_size_bytes,b2_key,b2_upload_id,uploader_id)
    values($1,$2,'cut',$3,'qa2.mp4','video/mp4',1048576,$4,$5,$6)`,
    [secondId,agencyId,itemId,`${agencyId}/cuts/${itemId}/${secondId}.mp4`,'rollback-qa-2',reassignedTo])
  await db.query(`update media_upload_sessions set state='completing' where id=$1`,[secondId])
  const second = await db.query('select phase5_complete_cut($1,$2,$3) as value',[secondId,reassignedTo,13])
  assert.equal(second.rows[0].value.version,firstVersion+1)
  const libraryId = randomUUID()
  await db.query(`insert into media_upload_sessions(id,agency_id,kind,client_id,folder_name,file_name,content_type,file_size_bytes,b2_key,b2_upload_id,uploader_id)
    values($1,$2,'library',$3,'B-roll','qa.jpg','image/jpeg',128,$4,'rollback-library',$5)`,
    [libraryId,agencyId,item.rows[0].client_id,`${agencyId}/library/${libraryId}.jpg`,adminId])
  await db.query(`update media_upload_sessions set state='completing' where id=$1`,[libraryId])
  const asset = await db.query('select phase5_complete_library($1,$2,$3) as value',[libraryId,adminId,'image'])
  assert.equal(asset.rows[0].value.folder_name,'B-roll')
  console.log(`Phase 5 rollback check passed: assignment, activity, cut v${firstVersion}/v${firstVersion+1}, replay, latest status, library asset.`)
} finally {
  if (began) await db.query('rollback')
  await db.end()
}
