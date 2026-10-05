/** Retry with exponential backoff for transient Drive and B2 failures. Pure; no server-only import so it is unit-tested. */

const TRANSIENT_STATUS = new Set([408, 429, 500, 502, 503, 504])
const TRANSIENT_CODES = new Set(['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN', 'ENOTFOUND', 'EPIPE', 'UND_ERR_CONNECT_TIMEOUT'])
const TRANSIENT_NAMES = new Set(['TimeoutError', 'RequestTimeout', 'SlowDown', 'ServiceUnavailable', 'InternalError', 'ThrottlingException', 'AbortError'])

/** Whether trying again could help: rate limits, timeouts, dropped connections and 5xx. Permission and not-found errors never are. */
export function isTransient(error: unknown): boolean {
  const e = error as { code?: string | number; status?: number; name?: string; response?: { status?: number }; $metadata?: { httpStatusCode?: number }; message?: string }
  const status = e?.status ?? e?.response?.status ?? e?.$metadata?.httpStatusCode ?? (typeof e?.code === 'number' ? e.code : undefined)
  if (status && TRANSIENT_STATUS.has(status)) return true
  if (typeof e?.code === 'string' && TRANSIENT_CODES.has(e.code)) return true
  if (e?.name && TRANSIENT_NAMES.has(e.name)) return true
  return /timed? ?out|socket hang up|network/i.test(e?.message ?? '')
}

export class RetryExhaustedError extends Error {
  constructor(public readonly service: string, public readonly attempts: number, public readonly cause: unknown) {
    super(`${service} is not responding right now. We tried ${attempts} times. Wait a minute and try again.`)
    this.name = 'RetryExhaustedError'
  }
}

export async function withRetry<T>(run: () => Promise<T>, options: { service: string; attempts?: number; baseMs?: number; sleep?: (ms: number) => Promise<void> }): Promise<T> {
  const attempts = options.attempts ?? 4
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)))
  let last: unknown
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try { return await run() }
    catch (error) {
      last = error
      if (!isTransient(error)) throw error
      if (attempt < attempts) await sleep((options.baseMs ?? 300) * 2 ** (attempt - 1) * (0.75 + Math.random() * 0.5))
    }
  }
  throw new RetryExhaustedError(options.service, attempts, last)
}
