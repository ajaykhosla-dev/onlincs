import assert from 'node:assert/strict'
import pg from 'pg'
import { google } from 'googleapis'

const database = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL, ssl: { rejectUnauthorized: false } })
await database.connect()
try {
  const result = await database.query(`select s.title,s.scheduled_start,s.drive_folder_id,si.drive_subfolder_id,si.idea_slug,c.name as client_name
    from shoots s join shoot_items si on si.shoot_id=s.id join clients c on c.id=s.client_id
    where s.id=(select id from shoots where id not like 'sh-%' and drive_folder_id is not null order by scheduled_start desc limit 1)
    order by si.idea_slug`)
  assert.ok(result.rows.length >= 1, 'Expected a live scheduled shoot with a Drive folder')
  const shoot = result.rows[0]
  const auth = new google.auth.JWT({ email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/drive.metadata.readonly'] })
  const drive = google.drive({ version: 'v3', auth })
  const folder = await drive.files.get({ fileId: shoot.drive_folder_id, fields: 'id,name,parents,driveId,mimeType', supportsAllDrives: true })
  assert.equal(folder.data.driveId, process.env.GOOGLE_SHARED_DRIVE_ID)
  for (const link of result.rows) {
    const idea = await drive.files.get({ fileId: link.drive_subfolder_id, fields: 'id,name,parents,driveId,mimeType', supportsAllDrives: true })
    assert.equal(idea.data.driveId, process.env.GOOGLE_SHARED_DRIVE_ID)
    assert.ok(idea.data.parents?.includes(shoot.drive_folder_id))
    assert.equal(idea.data.name, link.idea_slug)
  }
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(shoot.scheduled_start))
  const part = (type) => parts.find((p) => p.type === type)?.value
  const day = `${part('year')}-${part('month')}-${part('day')}`
  assert.equal(folder.data.name, `${day} ${shoot.title}`)
  const month = await drive.files.get({ fileId: folder.data.parents[0], fields: 'name,parents,driveId', supportsAllDrives: true })
  assert.equal(month.data.name, day.slice(0, 7))
  const client = await drive.files.get({ fileId: month.data.parents[0], fields: 'name,parents,driveId', supportsAllDrives: true })
  assert.equal(client.data.name, shoot.client_name)
  assert.ok(client.data.parents?.includes(process.env.GOOGLE_SHARED_DRIVE_ID))
  const children = await drive.files.list({ q: `'${shoot.drive_folder_id}' in parents and trashed=false and mimeType='application/vnd.google-apps.folder'`,
    fields: 'files(id,name)', corpora: 'drive', driveId: process.env.GOOGLE_SHARED_DRIVE_ID, includeItemsFromAllDrives: true, supportsAllDrives: true })
  assert.equal(children.data.files?.length, result.rows.length)
  const siblings = await drive.files.list({ q: `'${folder.data.parents[0]}' in parents and trashed=false and name='${folder.data.name.replace(/'/g, "\\'")}'`,
    fields: 'files(id)', corpora: 'drive', driveId: process.env.GOOGLE_SHARED_DRIVE_ID, includeItemsFromAllDrives: true, supportsAllDrives: true })
  assert.equal(siblings.data.files?.length, 1)
  console.log(`Drive verified: ${shoot.client_name} / ${day.slice(0, 7)} / ${folder.data.name}; ${result.rows.length} idea subfolders; one shoot folder`)
} finally { await database.end() }
