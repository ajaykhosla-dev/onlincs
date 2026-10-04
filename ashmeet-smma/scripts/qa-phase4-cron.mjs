/** Live Drive backstop QA. Dry-run by default; --apply creates a small direct Drive drop and cleans it up. */
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { Readable } from 'node:stream'
import pg from 'pg'
import { google } from 'googleapis'

const apply = process.argv.includes('--apply')
const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL, ssl: { rejectUnauthorized: false } })
const auth = new google.auth.JWT({ email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/drive'] })
const drive = google.drive({ version: 'v3', auth })
const name = `qa-cron-${randomUUID().slice(0, 12)}.bin`
let fileId
let target

async function cron(authorized) {
  const response = await fetch('http://localhost:3000/api/cron/phase4', {
    headers: authorized ? { Authorization: `Bearer ${process.env.CRON_SECRET}` } : {},
    signal: AbortSignal.timeout(180000),
  })
  const data = await response.json().catch(() => null)
  return { status: response.status, data }
}

await db.connect()
try {
  const preflight = await db.query(`select
    (select count(*)::int from shoots where drive_folder_id is null and status<>'cancelled') as unprovisioned,
    (select count(*)::int from shoot_folder_jobs where status in ('pending','failed')) as pending_jobs,
    (select page_token is not null from drive_sync_state where shared_drive_id=$1) as has_cursor`,
    [process.env.GOOGLE_SHARED_DRIVE_ID])
  console.log(`Cron preflight: ${JSON.stringify(preflight.rows[0])}`)
  const selection = await db.query(`select s.id as shoot_id,si.content_item_id,si.drive_subfolder_id,si.raw_uploaded_at,si.marked_by
    from shoots s join shoot_items si on si.shoot_id=s.id
    join raw_files r on r.shoot_id=s.id and r.content_item_id=si.content_item_id
    where s.title='Title of Sasuke' and s.status='scheduled' and r.file_name='sample-5s.mp4'
      and si.drive_subfolder_id is not null limit 1`)
  assert.equal(selection.rowCount, 1, 'Prepared test idea folder is unavailable')
  target = selection.rows[0]
  if (!apply) {
    console.log('Dry run: would initialize/check the cron cursor, drop one 1 KiB file directly into the ready idea folder, run cron twice, verify idempotence, then trash the QA file and remove its row.')
  } else {
    const unauthorized = await cron(false)
    assert.equal(unauthorized.status, 401)
    const initialized = await cron(true)
    assert.equal(initialized.status, 200, `Initial cron failed: ${initialized.data?.message ?? initialized.status}`)
    console.log(`Initial cron result: ${JSON.stringify(initialized.data)}`)
    const before = await db.query('select page_token from drive_sync_state where shared_drive_id=$1', [process.env.GOOGLE_SHARED_DRIVE_ID])
    assert.ok(before.rows[0]?.page_token, 'Cron did not initialize a Drive cursor')
    const created = await drive.files.create({ requestBody: { name, parents: [target.drive_subfolder_id], mimeType: 'application/octet-stream' },
      media: { mimeType: 'application/octet-stream', body: Readable.from(Buffer.alloc(1024)) },
      fields: 'id,name,size,parents', supportsAllDrives: true })
    fileId = created.data.id
    assert.ok(fileId && created.data.parents?.includes(target.drive_subfolder_id))
    let first
    for (let attempt = 1; attempt <= 5; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 5000))
      const detected = await cron(true)
      assert.equal(detected.status, 200, `Direct-drop cron failed: ${detected.data?.message ?? detected.status}`)
      console.log(`Direct-drop cron attempt ${attempt}: ${JSON.stringify(detected.data)}`)
      first = await db.query('select id,source,size_bytes from raw_files where drive_file_id=$1', [fileId])
      if (first.rowCount) break
    }
    if (!first.rowCount) {
      const changes = await drive.changes.list({ pageToken: before.rows[0].page_token,
        driveId: process.env.GOOGLE_SHARED_DRIVE_ID, supportsAllDrives: true, includeItemsFromAllDrives: true,
        fields: 'changes(fileId,removed,file(id,name,size,parents,trashed)),nextPageToken,newStartPageToken', pageSize: 1000 })
      console.log(`Drive changes from previous cursor: ${JSON.stringify((changes.data.changes ?? []).map((change) => ({
        fileId: change.fileId, removed: change.removed, name: change.file?.name,
        size: change.file?.size, parents: change.file?.parents?.length, trashed: change.file?.trashed,
      })))}`)
    }
    assert.equal(first.rowCount, 1, 'Cron did not record the direct Drive file')
    assert.equal(first.rows[0].source, 'drive_sync')
    assert.equal(Number(first.rows[0].size_bytes), 1024)
    const after = await db.query('select page_token from drive_sync_state where shared_drive_id=$1', [process.env.GOOGLE_SHARED_DRIVE_ID])
    assert.notEqual(after.rows[0].page_token, before.rows[0].page_token, 'Cron cursor did not advance')
    const again = await cron(true)
    assert.equal(again.status, 200)
    const copies = await db.query('select count(*)::int as count from raw_files where drive_file_id=$1', [fileId])
    assert.equal(copies.rows[0].count, 1)
    const wrapper = await db.query(`select count(*)::int as count from raw_files where file_name='sample-5s.mp4' and source='wrapper'`)
    assert.equal(wrapper.rows[0].count, 1, 'Cron duplicated a wrapper-uploaded file')
    console.log(`Cron passed: unauthenticated request 401, direct drop recorded, cursor advanced, rerun idempotent, wrapper file still unique.`)
  }
} finally {
  if (apply && fileId) {
    try {
      await drive.files.update({ fileId, requestBody: { trashed: true }, supportsAllDrives: true })
      await db.query('delete from raw_files where drive_file_id=$1 and file_name=$2', [fileId, name])
      await db.query('update shoot_items set raw_uploaded_at=$1,marked_by=$2 where shoot_id=$3 and content_item_id=$4',
        [target.raw_uploaded_at, target.marked_by, target.shoot_id, target.content_item_id])
      console.log('Cron QA file moved to Trash; database test row and arrival stamp cleaned up.')
    } catch (error) { console.error('Cron QA cleanup needs attention:', error.message) }
  }
  await db.end()
}
