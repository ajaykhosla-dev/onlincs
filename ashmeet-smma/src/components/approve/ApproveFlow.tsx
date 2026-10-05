'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type Done = 'approved' | 'changes' | null

/** The single-purpose page body: PIN prompt, then one video with Approve / Request changes. */
export function PinForm({ token, brand }: { token: string; brand: string }) {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!/^\d{4}$/.test(pin)) { setError('Enter the 4-digit PIN.'); return }
    setBusy(true); setError('')
    try {
      const response = await fetch(`/api/approve/${token}/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) })
      if (response.ok || response.status === 410 || response.status === 409 || response.status === 423 || response.status === 404) {
        router.refresh(); return
      }
      const payload = await response.json().catch(() => ({}))
      setError(payload.message ?? 'Something went wrong. Try again.')
      if (typeof payload.remaining === 'number') setError(`That PIN is not right. ${payload.remaining} ${payload.remaining === 1 ? 'try' : 'tries'} left.`)
      setPin('')
    } catch { setError('Could not reach the server. Check your connection and try again.') }
    finally { setBusy(false) }
  }

  return <form onSubmit={submit} noValidate>
    <div className="approve-brand">{brand}</div>
    <h1>Enter your PIN</h1>
    <p className="approve-sub">Your PIN is the 4-digit code that came with this link.</p>
    <div className="approve-field"><label htmlFor="pin">PIN</label>
      <input id="pin" className="pin" inputMode="numeric" autoComplete="one-time-code" pattern="\d{4}" maxLength={4}
        value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))} aria-describedby={error ? 'pin-error' : undefined} /></div>
    {error && <p id="pin-error" role="alert" className="approve-error">{error}</p>}
    <div className="approve-actions"><button className="approve-btn primary" type="submit" disabled={busy || pin.length !== 4}>{busy ? 'Checking…' : 'Continue'}</button></div>
  </form>
}

export function ApproveFlow({ token, brand, title }: { token: string; brand: string; title: string }) {
  const router = useRouter()
  const [src, setSrc] = useState('')
  const [videoError, setVideoError] = useState('')
  const [faststart, setFaststart] = useState<boolean | null>(null)
  const [mode, setMode] = useState<'choose' | 'changes'>('choose')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<Done>(null)

  async function loadVideo() {
    try {
      const response = await fetch(`/api/approve/${token}/media`, { cache: 'no-store' })
      const payload = await response.json()
      if (response.status === 401 || response.status === 410 || response.status === 409 || response.status === 423 || response.status === 404) { router.refresh(); return }
      if (!response.ok) throw new Error(payload.message ?? 'The video could not be loaded.')
      setSrc(payload.url); setFaststart(payload.faststart ?? null); setVideoError('')
    } catch (cause) { setVideoError(cause instanceof Error ? cause.message : 'The video could not be loaded.') }
  }
  useEffect(() => { queueMicrotask(() => void loadVideo()) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function respond(response: 'approved' | 'changes') {
    if (response === 'changes' && !text.trim()) { setError('Tell us what to change.'); return }
    setBusy(true); setError('')
    try {
      const result = await fetch(`/api/approve/${token}/respond`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response, text: response === 'changes' ? text : undefined }) })
      if (result.ok) { setDone(response); return }
      if (result.status === 409 || result.status === 410 || result.status === 423 || result.status === 401) { router.refresh(); return }
      const payload = await result.json().catch(() => ({}))
      setError(payload.message ?? 'Your response could not be saved. Try again.')
    } catch { setError('Could not reach the server. Check your connection and try again.') }
    finally { setBusy(false) }
  }

  if (done) return <div className="approve-notice" role="status">
    <div className="glyph ok" aria-hidden="true">✓</div>
    <h1>{done === 'approved' ? 'Approved. Thank you!' : 'Changes sent'}</h1>
    <p>{done === 'approved' ? `We have your approval for “${title}”. You can close this page.` : `We have your notes for “${title}” and will send a new version. You can close this page.`}</p>
  </div>

  return <div>
    <div className="approve-brand">{brand}</div>
    <h1>{title}</h1>
    <p className="approve-sub">Watch the video, then approve it or tell us what to change.</p>
    {src ? <video className="approve-video" src={src} controls playsInline preload="metadata"
      onError={() => setVideoError('The video could not be played. Check your connection and reload.')} />
      : <div className="approve-video-wrap" style={{ color: '#fff', fontSize: 14 }}>{videoError ? '' : 'Loading video…'}</div>}
    {faststart === false && <p className="approve-note" role="status">This video may take a moment to start.</p>}
    {videoError && <p role="alert" className="approve-error">{videoError} <button type="button" className="approve-btn secondary" style={{ minHeight: 40, marginTop: 8 }} onClick={() => { setVideoError(''); void loadVideo() }}>Try again</button></p>}
    {mode === 'choose' ? <div className="approve-actions">
      <button type="button" className="approve-btn primary" disabled={busy} onClick={() => void respond('approved')}>{busy ? 'Saving…' : 'Approve'}</button>
      <button type="button" className="approve-btn secondary" disabled={busy} onClick={() => setMode('changes')}>Request changes</button>
    </div> : <div>
      <div className="approve-field"><label htmlFor="changes">What should we change?</label>
        <textarea id="changes" value={text} onChange={(event) => setText(event.target.value)} maxLength={4000} autoFocus /></div>
      <div className="approve-actions">
        <button type="button" className="approve-btn primary" disabled={busy} onClick={() => void respond('changes')}>{busy ? 'Sending…' : 'Send changes'}</button>
        <button type="button" className="approve-btn secondary" disabled={busy} onClick={() => { setMode('choose'); setError('') }}>Back</button>
      </div>
    </div>}
    {error && <p role="alert" className="approve-error">{error}</p>}
  </div>
}
