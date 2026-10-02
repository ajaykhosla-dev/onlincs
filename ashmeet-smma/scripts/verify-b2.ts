/**
 * B2 verification script.
 * Run: npx tsx scripts/verify-b2.ts
 *
 * Tests:
 *  1. Upload a small binary file via presigned URL
 *  2. Download it back and verify bytes match
 *  3. Issue a Range: bytes=0-99 request and confirm 206 Partial Content
 *  4. Confirm unsigned access returns 401/403
 *  5. Delete the test object
 */

import { env } from '../src/lib/env'
import { b2Config, getUploadUrl, getDownloadUrl, downloadRange } from '../src/lib/b2/presign'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const anyCfg = b2Config as any

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
  console.log('\n=== B2 Verification ===\n')

  // Check config
  console.log('1. B2 Configuration:')
  check('B2 endpoint configured', !!anyCfg.endpoint && !anyCfg.endpoint.includes('placeholder'))
  check('B2 bucket configured', !!anyCfg.bucket && !anyCfg.bucket.includes('placeholder'))
  check('B2 key ID configured', !!anyCfg.keyId && !anyCfg.keyId.includes('placeholder'))

  if (failed > 0) {
    console.log('\nFill in B2 credentials in .env.local to run verification\n')
    process.exit(1)
  }

  const testFileName = `__verify/phase0-test-${Date.now()}.bin`
  const testContent = Buffer.from('Phase 0 B2 verification test data — hello from RapidArc!')

  // 2. Upload
  console.log('\n2. Upload test file:')
  let uploadUrl: string | null = null
  try {
    const result = await getUploadUrl(testFileName, 'application/octet-stream')
    uploadUrl = result.uploadUrl
    check('Got upload URL', !!uploadUrl)

    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${anyCfg.keyId}:${anyCfg.applicationKey}`).toString('base64')}`,
        'Content-Type': 'application/octet-stream',
        'X-Bz-File-Name': testFileName,
        'X-Bz-Content-Type': 'application/octet-stream',
      },
      body: testContent,
    })

    check('Upload returned 200', uploadRes.status === 200, `got ${uploadRes.status}`)
  } catch (e) {
    check('Upload', false, String(e))
  }

  // 3. Download and verify
  console.log('\n3. Download and verify bytes:')
  try {
    const downloadUrl = getDownloadUrl(testFileName)
    const dlRes = await fetch(downloadUrl, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${anyCfg.keyId}:${anyCfg.applicationKey}`).toString('base64')}`,
      },
    })

    check('Download returned 200', dlRes.status === 200, `got ${dlRes.status}`)
    check('Content-Type correct', dlRes.headers.get('Content-Type') === 'application/octet-stream')

    const downloaded = Buffer.from(await dlRes.arrayBuffer())
    check('Bytes match original', downloaded.equals(testContent), `expected ${testContent.length}, got ${downloaded.length}`)
  } catch (e) {
    check('Download', false, String(e))
  }

  // 4. Range request
  console.log('\n4. Range request (206 Partial Content):')
  try {
    const rangedRes = await downloadRange(testFileName, 0, 99)
    check('Range returned 206', rangedRes.status === 206, `got ${rangedRes.status}`)

    const rangeContent = Buffer.from(await rangedRes.arrayBuffer())
    check('Returned exactly 100 bytes', rangeContent.length === 100, `got ${rangeContent.length}`)
    check('Range content matches start of file', rangeContent.equals(testContent.slice(0, 100)))
  } catch (e) {
    check('Range request', false, String(e))
  }

  // 5. Unauthorized access
  console.log('\n5. Unauthorized access:')
  try {
    const downloadUrl = getDownloadUrl(testFileName)
    const unauthRes = await fetch(downloadUrl)
    check('Unauthenticated returns 401/403', unauthRes.status === 401 || unauthRes.status === 403, `got ${unauthRes.status}`)
  } catch (e) {
    check('Unauthorized', false, String(e))
  }

  // 6. Delete
  console.log('\n6. Cleanup:')
  try {
    const deleteUrl = `${anyCfg.endpoint}/${anyCfg.bucket}/${testFileName}`
    const delRes = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        Authorization: `Basic ${Buffer.from(`${anyCfg.keyId}:${anyCfg.applicationKey}`).toString('base64')}`,
      },
    })
    check('Delete returned 200', delRes.status === 200, `got ${delRes.status}`)
  } catch (e) {
    check('Delete', false, String(e))
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(e => {
  console.error('Verification failed:', e)
  process.exit(1)
})
