/** Reversible live arrival + notification QA. Dry-run by default. */
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
const name = `qa-arrival-${randomUUID().slice(0, 12)}.bin`
let fileId
let snapshot
let logIds = new Set()
let notificationIds = new Set()

async function cron() {
  const response = await fetch('http://localhost:3000/api/cron/phase4', {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` }, signal: AbortSignal.timeout(180000),
  })
  const data = await response.json().catch(() => null)
  assert.equal(response.status, 200, `Cron failed: ${data?.message ?? response.status}`)
  return data
}

async function relatedLogs(shootId, itemIds) {
  const result = await db.query(`select id,entity_type,entity_id,action,actor_type,from_state,to_state
    from activity_log where entity_id = any($1::text[])`, [[shootId, ...itemIds]])
  return result.rows
}

async function relatedNotifications(agencyId, recipients) {
  const result = await db.query(`select id,user_id,type,title,body from notifications
    where agency_id=$1 and user_id = any($2::text[]) and type='raw_arrived'`, [agencyId, recipients])
  return result.rows
}

async function cleanup() {
  const errors = []
  async function attempt(label, work) { try { await work() } catch (error) { errors.push(`${label}: ${error.message}`) } }
  if (fileId) await attempt('Drive QA file', async () => {
    const file = await drive.files.get({ fileId, fields: 'name,capabilities(canTrash)', supportsAllDrives: true })
    assert.equal(file.data.name, name)
    assert.equal(file.data.capabilities?.canTrash, true)
    await drive.files.update({ fileId, requestBody: { trashed: true }, supportsAllDrives: true })
  })
  if (fileId) await attempt('raw file row', async () => {
    await db.query('delete from raw_files where drive_file_id=$1 and file_name=$2', [fileId, name])
  })
  if (snapshot) {
    const itemIds = snapshot.items.map((item) => item.content_item_id)
    const recipients = [snapshot.manager_id, ...snapshot.items.map((item) => item.assigned_editor_id)].filter(Boolean)
    await attempt('new notifications', async () => {
      const rows = await relatedNotifications(snapshot.agency_id, recipients)
      const ids = rows.filter((row) => !notificationIds.has(row.id)).map((row) => row.id)
      if (ids.length) await db.query('delete from notifications where id = any($1::text[])', [ids])
    })
    await attempt('new activity', async () => {
      const rows = await relatedLogs(snapshot.shoot_id, itemIds)
      const ids = rows.filter((row) => !logIds.has(row.id)).map((row) => row.id)
      if (ids.length) await db.query('delete from activity_log where id = any($1::text[])', [ids])
    })
    await attempt('shoot state', async () => {
      await db.query('update shoots set status=$1,raw_detected_at=$2 where id=$3',
        [snapshot.status, snapshot.raw_detected_at, snapshot.shoot_id])
    })
    for (const item of snapshot.items) {
      await attempt(`item ${item.content_item_id}`, async () => {
        await db.query('update content_items set status=$1,updated_at=$2 where id=$3',
          [item.status, item.updated_at, item.content_item_id])
        await db.query('update shoot_items set raw_uploaded_at=$1,marked_by=$2 where shoot_id=$3 and content_item_id=$4',
          [item.raw_uploaded_at, item.marked_by, snapshot.shoot_id, item.content_item_id])
      })
    }
  }
  if (errors.length) throw new Error(`Arrival QA cleanup incomplete: ${errors.join(' | ')}`)
  if (apply) console.log('Arrival QA cleaned: test file trashed, database row removed, statuses/logs/notifications restored.')
}

await db.connect()
try {
  const shoot = await db.query(`select s.id,s.agency_id,s.status,s.raw_detected_at,c.manager_id
    from shoots s join clients c on c.id=s.client_id where s.title='Title of Sasuke'`)
  assert.equal(shoot.rowCount, 1)
  const s = shoot.rows[0]
  const items = await db.query(`select si.content_item_id,si.drive_subfolder_id,si.raw_uploaded_at,si.marked_by,
    ci.status,ci.updated_at,ci.assigned_editor_id
    from shoot_items si join content_items ci on ci.id=si.content_item_id where si.shoot_id=$1`, [s.id])
  assert.equal(items.rowCount, 2)
  const waiting = items.rows.find((item) => !item.raw_uploaded_at && item.assigned_editor_id)
  const arrived = items.rows.find((item) => item.raw_uploaded_at && item.status === 'shoot_scheduled')
  assert.ok(waiting?.drive_subfolder_id && arrived && s.status === 'scheduled', 'Test shoot is not in the expected reversible state')
  snapshot = { shoot_id: s.id, agency_id: s.agency_id, status: s.status,
    raw_detected_at: s.raw_detected_at, manager_id: s.manager_id, items: items.rows }
  const recipients = [s.manager_id, ...items.rows.map((item) => item.assigned_editor_id)].filter(Boolean)
  logIds = new Set((await relatedLogs(s.id, items.rows.map((item) => item.content_item_id))).map((row) => row.id))
  notificationIds = new Set((await relatedNotifications(s.agency_id, recipients)).map((row) => row.id))
  if (!apply) {
    console.log('Dry run: would drop one file into the waiting idea, poll Drive, verify shoot/content arrival and manager/editor notifications, then restore all rows.')
  } else {
    const created = await drive.files.create({ requestBody: { name, parents: [waiting.drive_subfolder_id], mimeType: 'application/octet-stream' },
      media: { mimeType: 'application/octet-stream', body: Readable.from(Buffer.alloc(1024)) },
      fields: 'id,name,parents', supportsAllDrives: true })
    fileId = created.data.id
    assert.ok(fileId && created.data.parents?.includes(waiting.drive_subfolder_id))
    let found = false
    for (let attempt = 1; attempt <= 5; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 5000))
      await cron()
      const result = await db.query('select id from raw_files where drive_file_id=$1', [fileId])
      if (result.rowCount) { found = true; break }
    }
    assert.ok(found, 'Cron did not record the test file')
    const updatedShoot = await db.query('select status from shoots where id=$1', [s.id])
    assert.equal(updatedShoot.rows[0].status, 'raw_uploaded')
    const updatedItem = await db.query('select status from content_items where id=$1', [arrived.content_item_id])
    assert.equal(updatedItem.rows[0].status, 'raw_uploaded')
    const logs = (await relatedLogs(s.id, items.rows.map((item) => item.content_item_id))).filter((row) => !logIds.has(row.id))
    assert.ok(logs.some((row) => row.entity_id === s.id && row.action === 'raw_arrived' && row.actor_type === 'system'))
    assert.ok(logs.some((row) => row.entity_id === arrived.content_item_id && row.action === 'content_status_changed'))
    const notifications = (await relatedNotifications(s.agency_id, recipients)).filter((row) => !notificationIds.has(row.id))
    assert.ok(notifications.some((row) => row.user_id === s.manager_id))
    assert.ok(notifications.some((row) => row.user_id === waiting.assigned_editor_id))
    console.log('Arrival passed: direct drop changed shoot and eligible idea to raw_uploaded; system log, manager notification, and editor notification were written.')
  }
} finally {
  try { if (apply) await cleanup() } finally { await db.end() }
}
