import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Signed, expiring cookie values for support access. No imports from the app's env module so the proxy can use it.
 * A value is `${sessionId}.${expiresAtSeconds}.${signature}`; the signature covers a purpose label so a "session"
 * cookie can never be replayed as an "elevation" cookie.
 */
export const SUPPORT_COOKIE = 'support_session'
export const ELEVATION_COOKIE = 'support_elevated'
export const SUPPORT_MAX_SECONDS = 2 * 60 * 60
export const ELEVATION_SECONDS = 15 * 60

const key = () => Buffer.from(process.env.CREDENTIAL_ENCRYPTION_KEY ?? '', 'base64')
const sign = (purpose: string, payload: string) => {
  const k = key()
  if (k.length !== 32) throw new Error('CREDENTIAL_ENCRYPTION_KEY is not configured')
  return createHmac('sha256', k).update(`${purpose}:${payload}`).digest('base64url')
}

export function issue(purpose: string, sessionId: string, seconds: number) {
  const payload = `${sessionId}.${Math.floor(Date.now() / 1000) + seconds}`
  return `${payload}.${sign(purpose, payload)}`
}

/** The session id inside a valid, unexpired cookie value, or null. */
export function verify(purpose: string, value: string | undefined | null): string | null {
  if (!value) return null
  const parts = value.split('.')
  if (parts.length !== 3) return null
  const [id, expires, signature] = parts
  const expected = sign(purpose, `${id}.${expires}`)
  const a = Buffer.from(signature), b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  return Number(expires) > Date.now() / 1000 ? id : null
}
