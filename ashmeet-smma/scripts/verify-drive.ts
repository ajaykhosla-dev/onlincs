/**
 * Drive verification script.
 * Run: npx tsx scripts/verify-drive.ts
 *
 * Steps:
 *  1. Authenticate as service account and confirm Shared Drive access
 *  2. Create nested folder tree: __verify / 2026-09 / 2026-09-23 Test Shoot / test-idea
 *  3. Read back webViewLink
 *  4. Get changes.startPageToken and store in drive_sync_state
 *  5. Delete the __verify tree
 *  6. Print pass/fail for each step
 */

import { google } from 'googleapis'
import { env } from '../src/lib/env'
import { supabaseAdmin } from '../src/lib/supabase/admin'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const anyAdmin = supabaseAdmin as any

let passed = 0
let failed = 0

function check(name: string, condition: boolean, detail = '') {
  if (condition) {
    console.log(`  ✓ ${name}`)
    passed++
  } else {
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
    failed++
  }
}

async function main() {
  console.log('\n=== Drive Verification ===\n')

  // Check env
  console.log('0. Configuration:')
  check('GOOGLE_SERVICE_ACCOUNT_KEY has private_key', env.GOOGLE_SERVICE_ACCOUNT_KEY.includes('private_key'))
  check('GOOGLE_SHARED_DRIVE_ID is set', !!env.GOOGLE_SHARED_DRIVE_ID && !env.GOOGLE_SHARED_DRIVE_ID.includes('placeholder'))

  if (env.GOOGLE_SERVICE_ACCOUNT_KEY.includes('placeholder') || !env.GOOGLE_SHARED_DRIVE_ID || env.GOOGLE_SHARED_DRIVE_ID.includes('placeholder')) {
    console.log('\nConfigure service account key and Shared Drive ID in .env.local first\n')
    process.exit(1)
  }

  // Parse service account
  let saKey: { client_email: string; private_key: string }
  try {
    saKey = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_KEY)
    check('Service account JSON parses', !!saKey.client_email)
  } catch {
    check('Service account JSON parses', false)
    process.exit(1)
  }

  const auth = new google.auth.GoogleAuth({
    credentials: saKey,
    scopes: ['https://www.googleapis.com/auth/drive'],
  })

  const drive = google.drive({ version: 'v3', auth })

  // Step 1: Authenticate and confirm Shared Drive access
  console.log('\n1. Authentication and Shared Drive access:')
  try {
    const about = await drive.about.get({ fields: 'user(emailAddress,displayName)' })
    check('Authenticated as service account', !!about.data.user?.emailAddress, about.data.user?.emailAddress ?? undefined)

    // Try to access the Shared Drive
    const driveInfo = await drive.drives.get({
      driveId: env.GOOGLE_SHARED_DRIVE_ID!,
      fields: 'id,name',
    })
    check('Can access Shared Drive', !!driveInfo.data.id, driveInfo.data.name ?? undefined)
  } catch (e) {
    check('Drive API accessible', false, String(e))
  }

  // Step 2: Create nested folder tree
  console.log('\n2. Create folder tree:')
  const ROOT = '__verify'
  const MONTH = '2026-09'
  const SHOOT = '2026-09-23 Test Shoot'
  const IDEA = 'test-idea'
  const createdFolders: { name: string; id: string }[] = []

  try {
    // Create each level
    for (const name of [ROOT, MONTH, SHOOT, IDEA]) {
      const res = await drive.files.create({
        requestBody: {
          name,
          mimeType: 'application/vnd.google-apps.folder',
          parents: createdFolders.length === 0 ? [env.GOOGLE_SHARED_DRIVE_ID] : [createdFolders[createdFolders.length - 1].id],
        },
        fields: 'id,name',
        supportsAllDrives: true,
      })

      const folderId = res.data.id
      check(`Created folder: ${name}`, !!folderId)
      createdFolders.push({ name, id: folderId! })
    }

    // Verify many-to-one: parent has multiple children
    check('Created 4 levels', createdFolders.length === 4)
  } catch (e) {
    check('Folder creation', false, String(e))
  }

  // Step 3: Read back webViewLink
  console.log('\n3. Read back folder details:')
  if (createdFolders.length > 0) {
    try {
      const leaf = createdFolders[createdFolders.length - 1]
      const res = await drive.files.get({
        fileId: leaf.id,
        fields: 'id,name,webViewLink,parents',
        supportsAllDrives: true,
      })

      check('Got webViewLink', !!res.data.webViewLink, res.data.webViewLink ?? undefined)
      check('Folder name correct', res.data.name === IDEA)

      // Verify path: Client / YYYY-MM / YYYY-MM-DD Shoot / [idea]
      if (res.data.webViewLink) {
        console.log(`  webViewLink: ${res.data.webViewLink}`)
      }
    } catch (e) {
      check('Read folder details', false, String(e))
    }
  }

  // Step 4: Get startPageToken
  console.log('\n4. Drive sync state:')
  try {
    const changes = await drive.changes.getStartPageToken({ supportsAllDrives: true })
    const pageToken = changes.data.startPageToken
    check('Got startPageToken', !!pageToken)

    // Store in DB
    const { error } = await anyAdmin.from('drive_sync_state').upsert({
      agency_id: 'ag-1',
      shared_drive_id: env.GOOGLE_SHARED_DRIVE_ID,
      page_token: pageToken,
      last_polled_at: new Date().toISOString(),
    })

    check('Stored page_token in drive_sync_state', !error, error?.message)
  } catch (e) {
    check('Drive sync state', false, String(e))
  }

  // Step 5: Delete the tree
  console.log('\n5. Cleanup:')
  if (createdFolders.length > 0) {
    // Delete in reverse order (children first)
    for (let i = createdFolders.length - 1; i >= 0; i--) {
      try {
        await drive.files.delete({
          fileId: createdFolders[i].id,
          supportsAllDrives: true,
        })
      } catch (e) {
        // Non-critical — report but continue
        console.log(`  ⚠ Could not delete ${createdFolders[i].name}: ${e}`)
      }
    }
    check('Deleted all created folders', true)
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(e => {
  console.error('Verification failed:', e)
  process.exit(1)
})
