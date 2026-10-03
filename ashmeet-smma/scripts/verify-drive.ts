/**
 * Drive verification. Run: npm run verify:drive
 *  1. Authenticate and confirm the Shared Drive is visible
 *  2. Create __verify / 2026-09 / 2026-09-23 Test Shoot / test-idea
 *  3. Read back the leaf's webViewLink
 *  4. changes.getStartPageToken, stored in drive_sync_state
 *  5. Delete the __verify tree
 *
 * A storage-quota error means the service account is writing to My Drive, not a Shared Drive:
 * fix the Shared Drive membership. Do not impersonate a user.
 */
import { env } from '../src/lib/env'
import { drive } from '../src/lib/drive/auth'
import { ensureFolder, provisionShootFolder } from '../src/lib/drive/folders'
import { supabaseAdmin } from '../src/lib/supabase/admin'

let failed = 0
const check = (name: string, ok: boolean, detail = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failed++
}

async function main() {
  console.log('1. Authenticate + Shared Drive')
  const sd = await drive.drives.get({ driveId: env.GOOGLE_SHARED_DRIVE_ID, fields: 'id,name' }).catch((e) => e)
  check('Shared Drive visible to the service account', !!sd?.data?.id, sd?.data?.name ?? String(sd?.message ?? ''))
  if (!sd?.data?.id) process.exit(1)

  console.log('2. Create folder tree')
  let rootId = ''
  let leafId = ''
  try {
    rootId = await ensureFolder('__verify', null)
    const t = await provisionShootFolder({ clientName: '__verify', month: '2026-09', shootTitle: '2026-09-23 Test Shoot', ideaSlug: 'test-idea' })
    leafId = t.ideaFolderId
    check('4-level tree created (Client / YYYY-MM / YYYY-MM-DD Shoot / idea)', !!leafId)
  } catch (e) {
    check('folder creation', false, String((e as Error).message))
  }

  console.log('3. webViewLink')
  if (leafId) {
    const f = await drive.files.get({ fileId: leafId, fields: 'name,webViewLink,driveId', supportsAllDrives: true })
    check('webViewLink returned', !!f.data.webViewLink, f.data.webViewLink ?? '')
    check('folder belongs to the Shared Drive, not a person', f.data.driveId === env.GOOGLE_SHARED_DRIVE_ID)
  }

  console.log('4. drive_sync_state')
  const tok = await drive.changes.getStartPageToken({ supportsAllDrives: true, driveId: env.GOOGLE_SHARED_DRIVE_ID })
  check('startPageToken obtained', !!tok.data.startPageToken)
  const { data: agency } = await supabaseAdmin.from('agencies').select('id').eq('slug', 'ashmeet-smma').single()
  const { error } = await supabaseAdmin.from('drive_sync_state').upsert({
    agency_id: agency?.id,
    shared_drive_id: env.GOOGLE_SHARED_DRIVE_ID,
    page_token: tok.data.startPageToken,
    last_polled_at: new Date().toISOString(),
  })
  check('page_token stored', !error, error?.message)

  console.log('5. Cleanup')
  // The "client" level is named __verify too, so remove every folder with that name at the drive root.
  const leftovers = await drive.files.list({
    q: `name='__verify' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    corpora: 'drive', driveId: env.GOOGLE_SHARED_DRIVE_ID, includeItemsFromAllDrives: true, supportsAllDrives: true, fields: 'files(id)',
  })
  let deleted = 0
  for (const f of leftovers.data.files ?? []) {
    try { await drive.files.delete({ fileId: f.id!, supportsAllDrives: true }); deleted++ } catch (e) {
      // deleting a parent removes its children, so a later "not found" means it is already gone
      if ((e as { code?: number }).code === 404) deleted++
      else console.log(`  could not delete ${f.id}: ${(e as Error).message}`)
    }
  }
  check('__verify tree deleted', deleted === (leftovers.data.files?.length ?? 0) && (!rootId || deleted > 0))

  console.log(failed ? `\n${failed} check(s) failed\n` : '\nAll Drive checks passed\n')
  process.exit(failed ? 1 : 0)
}
main().catch((e) => { console.error(e); process.exit(1) })
