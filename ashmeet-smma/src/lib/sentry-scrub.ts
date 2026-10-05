/**
 * Removes secrets from anything about to be sent to Sentry: magic-link tokens and PINs, auth headers and cookies,
 * signed URLs, credentials and request bodies. Pure so it can be tested by feeding it the very things that must not leak.
 */

const SECRET_KEY = /pass|pin\b|^pin|token|secret|authorization|cookie|credential|session_uri|session-uri|api[-_]?key|private|signature|x-amz|code_verifier|jwt|bearer|e-?mail/i
const FILTERED = '[Filtered]'

export function scrubString(value: string): string {
  return value
    .replace(/(\/approve\/)[^/?#\s"']+/gi, '$1[redacted]')
    .replace(/(\/api\/approve\/)[^/?#\s"']+/gi, '$1[redacted]')
    .replace(/([?&](?:X-Amz-[A-Za-z-]+|token|pin|key|signature|upload_id|uploadId|session|sessionUri|access_token|code)=)[^&#\s"']+/gi, `$1${FILTERED}`)
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, `Bearer ${FILTERED}`)
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, FILTERED)
    .replace(/\b[A-Za-z0-9_-]{43}\b/g, '[token]') // a 32-byte base64url magic-link token
}

export function scrubValue(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') return scrubString(value)
  if (value === null || typeof value !== 'object' || depth > 8) return value
  if (Array.isArray(value)) return value.map((entry) => scrubValue(entry, depth + 1))
  const out: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value)) out[key] = SECRET_KEY.test(key) ? FILTERED : scrubValue(entry, depth + 1)
  return out
}

type SentryLike = {
  request?: { url?: string; headers?: unknown; cookies?: unknown; data?: unknown; query_string?: unknown; [key: string]: unknown }
  user?: Record<string, unknown>
  [key: string]: unknown
}

/** `beforeSend` for every Sentry event. Request bodies, headers, cookies and query strings are dropped outright. */
export function scrubEvent<T extends SentryLike>(event: T): T {
  const scrubbed = scrubValue(event) as T
  if (scrubbed.request) {
    delete scrubbed.request.headers; delete scrubbed.request.cookies; delete scrubbed.request.data; delete scrubbed.request.query_string
    if (typeof scrubbed.request.url === 'string') scrubbed.request.url = scrubString(scrubbed.request.url.split('?')[0])
  }
  if (scrubbed.user) scrubbed.user = scrubbed.user.id ? { id: scrubbed.user.id } : {}
  return scrubbed
}

export function scrubBreadcrumb<T extends { message?: string; data?: unknown }>(crumb: T): T {
  return { ...crumb, message: crumb.message ? scrubString(crumb.message) : crumb.message, data: scrubValue(crumb.data) }
}
