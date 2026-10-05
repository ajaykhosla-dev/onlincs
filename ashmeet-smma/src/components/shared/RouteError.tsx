'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

/**
 * What every route group shows when a screen throws: a calm message and a retry, never a stack trace.
 * The error goes to Sentry (scrubbed) but nothing about it is shown to the user except an opaque reference.
 */
export function RouteError({ error, reset, area }: { error: Error & { digest?: string }; reset: () => void; area: string }) {
  useEffect(() => { Sentry.captureException(error) }, [error])
  return <section role="alert" style={{ padding: 28, maxWidth: 560 }}>
    <div className="card" style={{ padding: 24, display: 'grid', gap: 10 }}>
      <h1 style={{ margin: 0, fontSize: 22 }}>Something went wrong</h1>
      <p style={{ margin: 0, color: 'var(--ink-soft)', lineHeight: 1.6 }}>This {area} screen could not load. Nothing you did has been lost. Try again, and if it keeps happening, tell your admin.</p>
      {error.digest && <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>Reference: {error.digest}</p>}
      <div><button type="button" className="btn-dark" onClick={reset}>Try again</button></div>
    </div>
  </section>
}
