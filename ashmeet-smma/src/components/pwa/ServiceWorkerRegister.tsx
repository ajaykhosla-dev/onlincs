'use client'

import { useEffect } from 'react'

/** Registers /sw.js once. A new version installs in the background and takes over by itself. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then((registration) => {
      // Check for a new deployment's worker whenever the app comes back to the foreground.
      const check = () => { if (document.visibilityState === 'visible') void registration.update().catch(() => {}) }
      document.addEventListener('visibilitychange', check)
    }).catch(() => { /* the app works without it */ })
  }, [])
  return null
}
