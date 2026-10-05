'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { isIos, isStandalone, pushSupported, subscribeThisDevice } from '@/lib/push/client'

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
const safeGet = (key: string) => { try { return localStorage.getItem(key) } catch { return null } }
const safeSet = (key: string, value: string) => { try { localStorage.setItem(key, value) } catch { /* private mode */ } }

/**
 * Asks for push permission and offers installation, but only once the person has come back a few times,
 * never on the first load, and each prompt can be dismissed for good.
 */
export function PwaPrompts() {
  const [visits, setVisits] = useState(0)
  const [prompt, setPrompt] = useState<'push' | 'install' | 'ios' | null>(null)
  const [message, setMessage] = useState('')
  const install = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // One visit per browser session, so reloading does not count as coming back.
    let count = Number(safeGet('pwa-visits') ?? 0)
    try { if (!sessionStorage.getItem('pwa-visit-counted')) { count += 1; safeSet('pwa-visits', String(count)); sessionStorage.setItem('pwa-visit-counted', '1') } } catch { /* ignore */ }
    queueMicrotask(() => setVisits(count))
    const onInstall = (event: Event) => { event.preventDefault(); install.current = event as BeforeInstallPromptEvent; setPrompt((current) => current ?? (Number(safeGet('pwa-visits') ?? 0) >= 3 && !safeGet('install-dismissed') ? 'install' : null)) }
    window.addEventListener('beforeinstallprompt', onInstall)
    return () => window.removeEventListener('beforeinstallprompt', onInstall)
  }, [])

  useEffect(() => {
    if (visits < 2) return
    const canAskPush = pushSupported() && Notification.permission === 'default' && !safeGet('push-dismissed')
    const iosNeedsInstall = isIos() && !isStandalone() && !safeGet('install-dismissed') && visits >= 3
    queueMicrotask(() => setPrompt((current) => current ?? (canAskPush ? 'push' : iosNeedsInstall ? 'ios' : null)))
  }, [visits])

  if (!prompt) return null
  const dismiss = (key: string) => { safeSet(key, '1'); setPrompt(null) }

  return <div className="pwa-card" role="dialog" aria-label={prompt === 'push' ? 'Turn on notifications' : 'Install the app'}>
    {prompt === 'push' && <>
      <strong>Get a nudge when work needs you</strong>
      <p>Turn on notifications for new shoots, edits, approvals and anything waiting too long. You can change this any time in settings.</p>
      {message && <p role="alert">{message}</p>}
      <div className="pwa-actions">
        <button type="button" className="btn-dark" onClick={async () => {
          const result = await subscribeThisDevice()
          if (result.ok) setPrompt(null)
          else { setMessage(result.reason === 'denied' ? 'Notifications are blocked in your browser. You will still see them inside the app.' : 'Could not turn them on right now.'); safeSet('push-dismissed', '1') }
        }}>Turn on</button>
        <button type="button" className="btn-soft" onClick={() => dismiss('push-dismissed')}>Not now</button>
      </div></>}
    {prompt === 'install' && <>
      <strong>Install Ashmeet SMMA</strong>
      <p>Add it to your home screen to open it like an app, even on a weak connection.</p>
      <div className="pwa-actions">
        <button type="button" className="btn-dark" onClick={async () => { await install.current?.prompt(); await install.current?.userChoice.catch(() => null); setPrompt(null) }}>Install</button>
        <button type="button" className="btn-soft" onClick={() => dismiss('install-dismissed')}>Don&apos;t ask again</button>
      </div></>}
    {prompt === 'ios' && <>
      <strong>Install on your iPhone</strong>
      <p>Tap the Share button, then &ldquo;Add to Home Screen&rdquo;. Notifications on iPhone work once the app is installed.</p>
      <div className="pwa-actions"><button type="button" className="btn-soft" onClick={() => dismiss('install-dismissed')}>Got it</button></div></>}
    <Link href="/account/notifications" className="pwa-link">Notification settings</Link>
  </div>
}
