import pg from 'pg'
import { google } from 'googleapis'

const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL, ssl: { rejectUnauthorized: false } })
await db.connect()
try {
  const editors = await db.query(`select id,email from users where role='editor' and is_active and agency_id=
    (select agency_id from drive_sync_state where shared_drive_id=$1) order by id`, [process.env.GOOGLE_SHARED_DRIVE_ID])
  const auth = new google.auth.JWT({ email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/drive.metadata.readonly'] })
  const drive = google.drive({ version: 'v3', auth })
  const permissions = []
  let pageToken
  do {
    const result = await drive.permissions.list({ fileId: process.env.GOOGLE_SHARED_DRIVE_ID,
      fields: 'nextPageToken,permissions(id,type,emailAddress,role,deleted)', supportsAllDrives: true,
      pageSize: 100, pageToken })
    permissions.push(...result.data.permissions ?? [])
    pageToken = result.data.nextPageToken ?? undefined
  } while (pageToken)
  for (const editor of editors.rows) {
    const direct = permissions.find((permission) => permission.emailAddress?.toLowerCase() === editor.email.toLowerCase() && !permission.deleted)
    console.log(`${editor.id}: direct Shared Drive membership=${direct ? direct.role : 'not found'}; group or inherited access is not resolved by this check`)
  }
} finally { await db.end() }
