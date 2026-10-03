import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'

process.env.CREDENTIAL_ENCRYPTION_KEY = randomBytes(32).toString('base64')

test('encrypt/decrypt round-trips and is not plaintext', async () => {
  const { encrypt, decrypt } = await import('../src/lib/crypto')
  const uri = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=SECRET123'
  const enc = encrypt(uri)
  assert.ok(!enc.includes('SECRET123') && !Buffer.from(enc, 'base64').toString().includes('SECRET123'))
  assert.equal(decrypt(enc), uri)
  assert.notEqual(encrypt(uri), enc, 'fresh IV each time')
})

test('tampered ciphertext is rejected', async () => {
  const { encrypt, decrypt } = await import('../src/lib/crypto')
  const buf = Buffer.from(encrypt('hello'), 'base64')
  buf[buf.length - 1] ^= 1
  assert.throws(() => decrypt(buf.toString('base64')))
})

test('a wrong-length key is refused', async () => {
  const { encrypt } = await import('../src/lib/crypto')
  const good = process.env.CREDENTIAL_ENCRYPTION_KEY
  process.env.CREDENTIAL_ENCRYPTION_KEY = 'short'
  assert.throws(() => encrypt('x'), /32 bytes/)
  process.env.CREDENTIAL_ENCRYPTION_KEY = good
})
