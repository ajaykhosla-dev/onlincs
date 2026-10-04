/** Live, temporary B2 multipart / list / ranged-read check. Removes its objects. */
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { abortMultipart, completeMultipart, createMultipart, deleteObject, headObject, listParts, presignGet, presignPart } from '../src/lib/b2/presign'

const key = `__verify/phase5-${randomUUID()}.mp4`
const abortedKey = `__verify/phase5-abort-${randomUUID()}.bin`
async function main() {
let uploadId: string | null = null
let abortId: string | null = null
let completed = false
try {
  uploadId = await createMultipart(key,'video/mp4')
  const bytes = Buffer.alloc(9*1024*1024,0x41)
  const sizes = [8*1024*1024,1024*1024]
  const parts = []
  let offset = 0
  for (let i = 0; i < sizes.length; i++) {
    const url = await presignPart(key,uploadId,i+1)
    if (i === 0) {
      const preflight = await fetch(url,{ method:'OPTIONS',headers:{ Origin:'http://localhost:3000',
        'Access-Control-Request-Method':'PUT','Access-Control-Request-Headers':'content-type' } })
      assert.ok(preflight.ok && preflight.headers.get('access-control-allow-origin'),
        `Browser PUT preflight failed: ${preflight.status}`)
    }
    const response = await fetch(url,{ method:'PUT',body:bytes.subarray(offset,offset+sizes[i]) })
    assert.equal(response.status,200)
    offset += sizes[i]
    parts.push({ PartNumber:i+1,ETag:response.headers.get('etag')! })
  }
  const listed = await listParts(key,uploadId)
  assert.equal(listed.Parts?.length,2)
  assert.equal(listed.Parts?.reduce((sum,part) => sum+(part.Size ?? 0),0),bytes.length)
  await completeMultipart(key,uploadId,parts)
  completed = true
  assert.equal((await headObject(key)).ContentLength,bytes.length)
  const response = await fetch(await presignGet(key),{ headers:{ Range:'bytes=8388600-8388620' } })
  assert.equal(response.status,206)
  assert.equal((await response.arrayBuffer()).byteLength,21)
  abortId = await createMultipart(abortedKey,'application/octet-stream')
  await abortMultipart(abortedKey,abortId)
  abortId = null
  console.log('Phase 5 B2 check passed: two signed parts, list, complete, size, ranged 206, abort.')
} finally {
  if (uploadId && !completed) await abortMultipart(key,uploadId).catch(() => {})
  if (completed) await deleteObject(key)
  if (abortId) await abortMultipart(abortedKey,abortId).catch(() => {})
}
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
