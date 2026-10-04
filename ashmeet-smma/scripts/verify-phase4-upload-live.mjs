// Read-only check of recent upload progress and the latest real file.
// Never print session URIs or credentials.
import assert from 'node:assert/strict'
import pg from 'pg'
import { google } from 'googleapis'

const client = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL, ssl: { rejectUnauthorized: false } })
await client.connect()
try {
  const result = await client.query(`
    select s.status, s.file_name, s.file_size_bytes, s.bytes_received,
      s.created_at, s.last_progress_at, sh.title as shoot_title
    from upload_sessions s
    join shoots sh on sh.id = s.shoot_id
    order by s.created_at desc
    limit 5
  `)
  for (const row of result.rows) {
    console.log(JSON.stringify({
      shoot: row.shoot_title,
      file: row.file_name,
      status: row.status,
      bytes: `${row.bytes_received}/${row.file_size_bytes}`,
      createdAt: row.created_at,
      lastProgressAt: row.last_progress_at,
    }))
  }
  if (!result.rows.length) console.log('No upload sessions found.')
  const uploaded = await client.query(`
    select r.drive_file_id, r.file_name, r.size_bytes, si.drive_subfolder_id,
      (select count(*)::int from raw_files where drive_file_id = r.drive_file_id) as copies
    from raw_files r
    join shoot_items si on si.shoot_id = r.shoot_id and si.content_item_id = r.content_item_id
    where r.source = 'wrapper' and r.file_name = 'sample-5s.mp4'
    order by r.uploaded_at desc
    limit 1
  `)
  if (uploaded.rows.length) {
    const row = uploaded.rows[0]
    assert.equal(row.copies, 1)
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/drive.metadata.readonly'],
    })
    const drive = google.drive({ version: 'v3', auth })
    const file = await drive.files.get({
      fileId: row.drive_file_id,
      fields: 'id,name,size,parents,driveId',
      supportsAllDrives: true,
    })
    assert.equal(file.data.name, row.file_name)
    assert.equal(Number(file.data.size), Number(row.size_bytes))
    assert.ok(file.data.parents?.includes(row.drive_subfolder_id))
    assert.equal(file.data.driveId, process.env.GOOGLE_SHARED_DRIVE_ID)
    console.log(`Latest wrapper file verified in Drive: ${row.file_name}; ${row.size_bytes} bytes; one raw_files row; correct idea folder`)
  }
} finally {
  await client.end()
}
