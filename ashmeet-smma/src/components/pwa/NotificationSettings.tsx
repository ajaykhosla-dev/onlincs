'use client'

import { useEffect, useState } from 'react'
import { CATEGORIES, CATEGORY_LABELS, DEFAULT_PREFS, type Prefs } from '@/lib/push/prefs'
import { isIos, isStandalone, pushSupported, subscribeThisDevice, thisDeviceSubscribed, unsubscribeThisDevice } from '@/lib/push/client'

type DeviceState = 'checking' | 'unsupported' | 'ios-install' | 'denied' | 'off' | 'on'

export function NotificationSettings() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS)
  const [loaded, setLoaded] = useState(false)
  const [device, setDevice] = useState<DeviceState>('checking')
  const [devices, setDevices] = useState(0)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  async function refreshDevice() {
    if (!pushSupported()) { setDevice(isIos() && !isStandalone() ? 'ios-install' : 'unsupported'); return }
    if (Notification.permission === 'denied') { setDevice('denied'); return }
    setDevice((await thisDeviceSubscribed()) ? 'on' : 'off')
    const response = await fetch('/api/push/subscribe', { cache: 'no-store' }).catch(() => null)
    if (response?.ok) setDevices((await response.json()).devices)
  }
  useEffect(() => {
    queueMicrotask(() => void refreshDevice())
    fetch('/api/notification-prefs', { cache: 'no-store' }).then((response) => response.json()).then((data) => { setPrefs(data.prefs); setLoaded(true) })
      .catch(() => { setError('Could not load your preferences.'); setLoaded(true) })
  }, [])

  async function save(next: Prefs) {
    setPrefs(next); setMessage(''); setError('')
    const response = await fetch('/api/notification-prefs', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) }).catch(() => null)
    if (response?.ok) setMessage('Saved.'); else setError((await response?.json().catch(() => ({})))?.message ?? 'Could not save your preferences.')
  }
  async function toggleDevice() {
    setBusy('device'); setMessage(''); setError('')
    if (device === 'on') await unsubscribeThisDevice()
    else { const result = await subscribeThisDevice(); if (!result.ok) setError(result.reason === 'denied' ? 'Notifications are blocked for this site in your browser settings.' : 'Could not turn notifications on for this device.') }
    await refreshDevice(); setBusy('')
  }
  async function sendTest() {
    setBusy('test'); setMessage(''); setError('')
    const response = await fetch('/api/push/test', { method: 'POST' }).catch(() => null)
    const payload = await response?.json().catch(() => ({}))
    if (response?.ok) setMessage(`Test sent to ${payload.sent} ${payload.sent === 1 ? 'device' : 'devices'}.`); else setError(payload?.message ?? 'Could not send a test.')
    setBusy('')
  }

  return <div className="account-card">
    <h1>Notifications</h1>
    <p className="cm-meta">Alerts always appear in the bell inside the app. These settings only control push to your devices.</p>

    <section className="cm-block">
      <h3>This device</h3>
      {device === 'checking' && <p role="status">Checking…</p>}
      {device === 'unsupported' && <p>This browser cannot receive push notifications. You will still see everything in the bell.</p>}
      {device === 'ios-install' && <p>On iPhone, install the app first: tap Share, then &ldquo;Add to Home Screen&rdquo;, and open it from there. Then come back to turn push on.</p>}
      {device === 'denied' && <p>Notifications are blocked for this site. Allow them in your browser&apos;s site settings, then reload. The app keeps working with in-app notifications.</p>}
      {(device === 'on' || device === 'off') && <>
        <p>{device === 'on' ? 'Push is on for this device.' : 'Push is off for this device.'}{devices > 0 ? ` You have ${devices} ${devices === 1 ? 'device' : 'devices'} subscribed in total.` : ''}</p>
        <div className="cm-actions">
          <button type="button" className="btn-dark" disabled={!!busy} onClick={() => void toggleDevice()}>{device === 'on' ? 'Turn off on this device' : 'Turn on for this device'}</button>
          {device === 'on' && <button type="button" className="btn-soft" disabled={!!busy} onClick={() => void sendTest()}>{busy === 'test' ? 'Sending…' : 'Send a test'}</button>}
        </div></>}
    </section>

    <section className="cm-block">
      <h3>What to be told about</h3>
      {CATEGORIES.map((category) => <label key={category} className="pref-row">
        <input type="checkbox" checked={prefs.categories[category]} disabled={!loaded}
          onChange={(event) => void save({ ...prefs, categories: { ...prefs.categories, [category]: event.target.checked } })} />
        <span><b>{CATEGORY_LABELS[category].label}</b><small>{CATEGORY_LABELS[category].hint}</small></span>
      </label>)}
    </section>

    <section className="cm-block">
      <h3>Quiet hours</h3>
      <label className="pref-row"><input type="checkbox" checked={prefs.quiet_enabled} disabled={!loaded}
        onChange={(event) => void save({ ...prefs, quiet_enabled: event.target.checked })} />
        <span><b>Pause push during quiet hours</b><small>Notifications still collect in the bell, and nothing is sent late afterwards.</small></span></label>
      {prefs.quiet_enabled && <div className="cm-actions">
        <label className="cm-label">From <input type="time" value={prefs.quiet_start} onChange={(event) => event.target.value && void save({ ...prefs, quiet_start: event.target.value })} /></label>
        <label className="cm-label">Until <input type="time" value={prefs.quiet_end} onChange={(event) => event.target.value && void save({ ...prefs, quiet_end: event.target.value })} /></label>
        <span className="cm-meta">Indian Standard Time</span></div>}
    </section>
    {message && <p role="status" className="cm-meta">{message}</p>}
    {error && <p role="alert" className="rv-error">{error}</p>}
  </div>
}
