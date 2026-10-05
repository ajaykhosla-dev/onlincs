'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

/** Last resort when even the root layout fails. Plain markup only, so it cannot itself fail. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error) }, [error])
  return <html lang="en"><body style={{ margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#E8E8F6', color: '#1B1B3A', fontFamily: 'system-ui, sans-serif' }}>
    <main role="alert" style={{ maxWidth: 440, background: '#fff', borderRadius: 22, padding: 28, textAlign: 'center' }}>
      <h1 style={{ marginTop: 0 }}>Something went wrong</h1>
      <p style={{ color: '#63637F', lineHeight: 1.6 }}>The app could not start. Nothing has been lost. Try again.</p>
      <button type="button" onClick={reset} style={{ minHeight: 46, padding: '0 22px', border: 0, borderRadius: 14, background: '#1B1B3A', color: '#fff', font: '700 15px system-ui', cursor: 'pointer' }}>Try again</button>
    </main>
  </body></html>
}
