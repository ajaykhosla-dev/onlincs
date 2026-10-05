import * as Sentry from '@sentry/nextjs'
import { scrubBreadcrumb, scrubEvent } from '@/lib/sentry-scrub'

/** Browser error reporting. Inert unless NEXT_PUBLIC_SENTRY_DSN is set; every payload is scrubbed of secrets first. */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
if (dsn) {
  Sentry.init({
    dsn, sendDefaultPii: false, tracesSampleRate: 0, replaysSessionSampleRate: 0, replaysOnErrorSampleRate: 0,
    beforeSend: (event) => scrubEvent(event as never) as typeof event,
    beforeBreadcrumb: (crumb) => scrubBreadcrumb(crumb as never) as typeof crumb,
  })
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
