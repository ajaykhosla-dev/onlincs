import 'server-only'
import { createHash, createHmac, randomBytes, randomInt, scrypt, timingSafeEqual } from 'node:crypto'
import { env } from '@/lib/env'

/** 32 random bytes, base64url (43 chars). Only its SHA-256 is stored. */
export const newToken = () => randomBytes(32).toString('base64url')
export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')
export const newPin = () => String(randomInt(0, 10000)).padStart(4, '0')

function derive(pin: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => scrypt(pin, salt, 32, (error, key) => error ? reject(error) : resolve(key)))
}

/** A four-digit PIN has little entropy, so it is salted and slow-hashed; the attempt lock is the online defence. */
export async function hashPin(pin: string) {
  const salt = randomBytes(16)
  return `s1$${salt.toString('hex')}$${(await derive(pin, salt)).toString('hex')}`
}

export async function verifyPin(pin: string, stored: string) {
  const [version, saltHex, hashHex] = stored.split('$')
  if (version !== 's1' || !saltHex || !hashHex) return false
  const expected = Buffer.from(hashHex, 'hex')
  const actual = await derive(pin, Buffer.from(saltHex, 'hex'))
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

// PIN-verified browsers hold a short signed cookie so the video and response routes need no account.
export const SESSION_COOKIE = 'approval_session'
export const SESSION_SECONDS = 30 * 60
const sign = (payload: string) => createHmac('sha256', Buffer.from(env.CREDENTIAL_ENCRYPTION_KEY, 'base64'))
  .update(`approval-session:${payload}`).digest('base64url')

export function issueSession(linkId: string) {
  const payload = `${linkId}.${Math.floor(Date.now() / 1000) + SESSION_SECONDS}`
  return `${payload}.${sign(payload)}`
}

export function sessionValid(linkId: string, value: string | undefined) {
  if (!value) return false
  const parts = value.split('.')
  if (parts.length !== 3) return false
  const [id, expires, signature] = parts
  const expected = sign(`${id}.${expires}`)
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false
  return id === linkId && Number(expires) > Date.now() / 1000
}
