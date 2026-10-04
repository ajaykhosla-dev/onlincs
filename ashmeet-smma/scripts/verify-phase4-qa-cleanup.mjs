import assert from 'node:assert/strict'
import pg from 'pg'
import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'

const fileId = process.argv[2]
const trash = process.argv.includes('--trash')
assert.ok(fileId, 'Pass the temporary QA Drive file id')
const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL, ssl: { rejectUnauthorized: false } })
await db.connect()
try {
  const result = await db.query(`select
    (select count(*)::int from users where email like 'qa-cameraman-%@example.invalid') as qa_users,
    (select count(*)::int from upload_sessions where file_name like 'qa-resume-%.bin') as qa_sessions,
    (select count(*)::int from raw_files where drive_file_id=$1) as qa_files,
    (select u.email from shoots s join users u on u.id=s.cameraman_id where s.title='Title of Sasuke' limit 1) as shoot_cameraman,
    (select status from shoots where title='Title of Sasuke' limit 1) as shoot_status`, [fileId])
  console.log(JSON.stringify(result.rows[0]))
  assert.equal(result.rows[0].qa_users, 0)
  assert.equal(result.rows[0].qa_sessions, 0)
  assert.equal(result.rows[0].qa_files, 0)
  assert.ok(!result.rows[0].shoot_cameraman?.startsWith('qa-cameraman-'))
  assert.equal(result.rows[0].shoot_status, 'scheduled')
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: identities, error: authError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (authError) throw authError
  assert.equal(identities.users.filter((user) => user.email?.startsWith('qa-cameraman-')).length, 0)
  const auth = new google.auth.JWT({ email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: [trash ? 'https://www.googleapis.com/auth/drive' : 'https://www.googleapis.com/auth/drive.metadata.readonly'] })
  const drive = google.drive({ version: 'v3', auth })
  try {
    const file = await drive.files.get({ fileId, fields: 'id,name,parents,trashed,capabilities(canTrash,canDelete)', supportsAllDrives: true })
    console.log(`QA Drive file still exists: ${file.data.name}; trashed=${file.data.trashed}; canTrash=${file.data.capabilities?.canTrash}; canDelete=${file.data.capabilities?.canDelete}`)
    if (trash && !file.data.trashed) {
      assert.ok(file.data.name?.startsWith('qa-resume-') && file.data.name.endsWith('.bin'))
      assert.equal(file.data.capabilities?.canTrash, true)
      await drive.files.update({ fileId, requestBody: { trashed: true }, supportsAllDrives: true })
      const checked = await drive.files.get({ fileId, fields: 'trashed', supportsAllDrives: true })
      assert.equal(checked.data.trashed, true)
      console.log('QA Drive file moved to Trash.')
    }
  } catch (error) {
    if (error.code !== 404) throw error
    console.log('QA Drive file is absent (404).')
  }
} finally { await db.end() }
