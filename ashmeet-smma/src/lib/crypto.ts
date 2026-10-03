import 'server-only'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

// AES-256-GCM. Output format: base64(iv[12] | tag[16] | ciphertext).
// Reads the key directly (env.ts validates the same value at app start) so this module stays testable alone.
function key() {
  const k = Buffer.from(process.env.CREDENTIAL_ENCRYPTION_KEY ?? '', 'base64')
  if (k.length !== 32) throw new Error('CREDENTIAL_ENCRYPTION_KEY must be base64 of 32 bytes')
  return k
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString('base64')
}

export function decrypt(payload: string): string {
  const buf = Buffer.from(payload, 'base64')
  const decipher = createDecipheriv('aes-256-gcm', key(), buf.subarray(0, 12))
  decipher.setAuthTag(buf.subarray(12, 28))
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8')
}
