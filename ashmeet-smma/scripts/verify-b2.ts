/**
 * B2 verification. Run: npm run verify:b2
 *  1. Multipart upload via presigned part URLs (direct to B2)
 *  2. Presigned GET, bytes identical
 *  3. Range: bytes=0-99 -> 206 with exactly 100 bytes
 *  4. Unsigned access rejected
 *  5. Delete the object
 */
import { verifyKey } from '../src/lib/b2/keys'
import {
  createMultipart, presignPart, completeMultipart, presignGet, unsignedUrl, deleteObject,
} from '../src/lib/b2/presign'

let failed = 0
function check(name: string, ok: boolean, detail = '') {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${!ok && detail ? ` — ${detail}` : ''}`)
  if (!ok) failed++
}

async function main() {
  const key = verifyKey()
  // single 256 byte part is fine for B2 when it is the last part
  const body = Buffer.alloc(256)
  for (let i = 0; i < body.length; i++) body[i] = i % 251

  console.log('1. Multipart upload (direct to B2)')
  const uploadId = await createMultipart(key, 'application/octet-stream')
  const partUrl = await presignPart(key, uploadId, 1)
  const put = await fetch(partUrl, { method: 'PUT', body })
  check('part PUT 200', put.status === 200, String(put.status))
  const etag = put.headers.get('etag') ?? ''
  check('part returned ETag', !!etag)
  await completeMultipart(key, uploadId, [{ PartNumber: 1, ETag: etag }])
  check('multipart completed', true)

  console.log('2. Presigned GET round trip')
  const url = await presignGet(key)
  const get = await fetch(url)
  const got = Buffer.from(await get.arrayBuffer())
  check('GET 200', get.status === 200, String(get.status))
  check('bytes identical', got.equals(body), `${got.length} vs ${body.length}`)

  console.log('3. Ranged request')
  const ranged = await fetch(url, { headers: { Range: 'bytes=0-99' } })
  const rb = Buffer.from(await ranged.arrayBuffer())
  check('206 Partial Content', ranged.status === 206, String(ranged.status))
  check('exactly 100 bytes', rb.length === 100, String(rb.length))
  check('range content matches', rb.equals(body.subarray(0, 100)))

  console.log('4. Unsigned access')
  const unsigned = await fetch(unsignedUrl(key))
  check('unsigned rejected (401/403)', unsigned.status === 401 || unsigned.status === 403, String(unsigned.status))

  console.log('5. Cleanup')
  await deleteObject(key)
  const after = await fetch(await presignGet(key))
  check('object deleted (404)', after.status === 404, String(after.status))

  console.log(failed ? `\n${failed} check(s) failed\n` : '\nAll B2 checks passed\n')
  process.exit(failed ? 1 : 0)
}
main().catch((e) => { console.error(e); process.exit(1) })
