'use client'

import { useEffect, useState } from 'react'

/** Shown while the browser is offline. (Phase 10 adds real offline caching; here it only reports connectivity.) */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false)
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  return (
    <div className={`offline-banner${offline ? ' is-visible' : ''}`} role="status">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M1 1l22 22M16.7 16.7A8 8 0 0 0 5 18.3M8.5 12.5a5 5 0 0 1 4-1.9M2 8.8A11 11 0 0 1 5.6 6.4M22 8.8a11 11 0 0 0-3.2-2.6" />
        <path d="M12 20h.01" />
      </svg>
      You&apos;re offline — your schedule is saved and will sync when you reconnect.
    </div>
  )
}
