/**
 * Phase 0 / Step 7 server-side checks for the upload wrapper, run against the real Drive and database.
 * Run: npx tsx --conditions=react-server --env-file=.env.local scripts/verify-upload-logic.ts
 *
 *  - an unassigned cameraman, an editor and a non-owner get 403
 *  - the seeded expired session is reported as expired AND recoverable
 *  - a real session's progress query matches the bytes Google actually holds (sent browser-style, no credentials)
 *  - replaying completion leaves exactly one raw_files row
 * Test rows it creates are deleted at the end.
 */
import { createUploadSession, getProgress, completeUpload } from '../src/lib/drive/sessions'
import { supabaseAdmin } from '../src/lib/supabase/admin'
import type { User } from '../src/types/database'

let failed = 0
const check = (name: string, ok: boolean, detail = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failed++
}
const user = async (id: string) => (await supabaseAdmin.from('users').select('*').eq('id', id).single()).data as User

async function main() {
  const harpreet = await user('u-7') // assigned to sh-1
  const vikram = await user('u-8') // cameraman, NOT assigned to sh-1
  const rohit = await user('u-5') // editor
  const created: string[] = []
  const base = { shootId: 'sh-1', contentItemId: 'ci-1', fileName: 'verify.bin', fileSizeBytes: 1024 * 1024, mimeType: 'application/octet-stream', origin: 'http://localhost:3000' }

  console.log('1. Authorization on session creation')
  for (const [label, u] of [['unassigned cameraman', vikram], ['editor', rohit]] as const) {
    const r = await createUploadSession(u, base)
    check(`${label} gets 403`, !r.ok && r.error.code === 'forbidden', r.ok ? 'was allowed!' : r.error.code)
  }

  console.log('2. Expired session is detected and recoverable')
  const seededExpired = await getProgress(await user('u-7'), 'us-3')
  check('expired session reported as recoverable', !seededExpired.ok && seededExpired.error.code === 'expired' && seededExpired.error.recoverable === true,
    seededExpired.ok ? 'not flagged' : seededExpired.error.code)

  console.log('3. Real session: progress matches what Google holds')
  const made = await createUploadSession(harpreet, base)
  check('assigned cameraman can create a session', made.ok, made.ok ? '' : made.error.message)
  if (made.ok) {
    created.push(made.value.sessionId)
    const { sessionId, sessionUri, expiresAt } = made.value
    const days = (new Date(expiresAt).getTime() - Date.now()) / 86400000
    check('expires_at is about a week out', days > 6.9 && days < 7.1, `${days.toFixed(2)} days`)

    const before = await getProgress(harpreet, sessionId)
    check('fresh session reports 0 bytes', before.ok && before.value.bytesReceived === 0)

    // 256 KiB chunk straight to Google, no Authorization header, like the browser does
    const chunk = Buffer.alloc(256 * 1024, 7)
    const put = await fetch(sessionUri, { method: 'PUT', headers: { 'Content-Range': `bytes 0-${chunk.length - 1}/${base.fileSizeBytes}`, Origin: 'http://localhost:3000' }, body: chunk })
    check('Google accepts a credential-free chunk PUT (308 resume incomplete)', put.status === 308, String(put.status))
    check('CORS header present for the app origin', (put.headers.get('access-control-allow-origin') ?? '') !== '', put.headers.get('access-control-allow-origin') ?? 'missing')

    const after = await getProgress(harpreet, sessionId)
    check('progress equals bytes Google holds (262144)', after.ok && after.value.bytesReceived === chunk.length, after.ok ? String(after.value.bytesReceived) : after.error.code)
    const row = await supabaseAdmin.from('upload_sessions').select('bytes_received').eq('id', sessionId).single()
    check('bytes_received in the database matches', Number(row.data?.bytes_received) === chunk.length)

    const stranger = await getProgress(vikram, sessionId)
    check('another cameraman cannot read this session (403)', !stranger.ok && stranger.error.code === 'forbidden')
  }

  console.log('4. Completion replay is idempotent (using the real uploaded file)')
  const done = await supabaseAdmin.from('upload_sessions').select('id,started_by').eq('status', 'complete').like('id', '98944a2a%').single()
  const raw = await supabaseAdmin.from('raw_files').select('drive_file_id').eq('file_name', 'Feature demo.mp4').order('uploaded_at', { ascending: false }).limit(1).single()
  if (done.data && raw.data) {
    const owner = await user(done.data.started_by)
    const a = await completeUpload(owner, done.data.id, raw.data.drive_file_id)
    const b = await completeUpload(owner, done.data.id, raw.data.drive_file_id)
    const count = await supabaseAdmin.from('raw_files').select('id', { count: 'exact', head: true }).eq('drive_file_id', raw.data.drive_file_id)
    check('both calls succeed', a.ok && b.ok)
    check('exactly one raw_files row for the Drive file', count.count === 1, String(count.count))
    const notOwner = await completeUpload(harpreet, done.data.id, raw.data.drive_file_id)
    check('a non-owner cannot complete someone else\'s session', !notOwner.ok && notOwner.error.code === 'forbidden')
  } else {
    check('found the completed test upload', false)
  }

  if (created.length) await supabaseAdmin.from('upload_sessions').delete().in('id', created)
  console.log(failed ? `\n${failed} check(s) failed\n` : '\nAll upload-logic checks passed\n')
  process.exit(failed ? 1 : 0)
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
