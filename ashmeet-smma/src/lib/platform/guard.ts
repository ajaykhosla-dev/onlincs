import { ELEVATION_COOKIE, SUPPORT_COOKIE, verify } from './signed'

/**
 * Whether an API request is allowed during a support session. Pure so every case is tested. Support sessions are read-only:
 * a write needs the separate elevation cookie issued for the same session. The platform's own routes stay writable so the
 * owner can exit, elevate and manage agencies.
 */
export function supportWriteBlocked(input: { method: string; pathname: string; supportCookie?: string; elevationCookie?: string }): boolean {
  const session = verify(SUPPORT_COOKIE, input.supportCookie)
  if (!session) return false // not in a support session
  if (['GET', 'HEAD', 'OPTIONS'].includes(input.method.toUpperCase())) return false
  if (input.pathname.startsWith('/api/platform/')) return false
  return verify(ELEVATION_COOKIE, input.elevationCookie) !== session
}
