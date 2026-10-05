import * as Sentry from '@sentry/nextjs'
import { scrubBreadcrumb, scrubEvent } from '@/lib/sentry-scrub'

/** Server and edge error reporting. Inert unless SENTRY_DSN is set; every payload is scrubbed of secrets first. */
export async function register() {
  const dsn = process.env.SENTRY_DSN
  if (!dsn) return
  Sentry.init({
    dsn, enabled: true, sendDefaultPii: false, tracesSampleRate: 0,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    beforeSend: (event) => scrubEvent(event as never) as typeof event,
    beforeBreadcrumb: (crumb) => scrubBreadcrumb(crumb as never) as typeof crumb,
  })
}

export const onRequestError = Sentry.captureRequestError
