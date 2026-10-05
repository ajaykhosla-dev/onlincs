/* eslint-disable @next/next/no-img-element -- a data-URL QR code and an agency-supplied logo URL cannot go through next/image */
'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type Setup = { factorId: string; qr: string; secret: string }

/**
 * Two-factor for the platform owner. First time: enrol an authenticator app (scan the code, confirm one code).
 * After that: enter the current code. The console stays locked until the session reaches assurance level 2.
 */
export function MfaForm({ enrolledFactorId }: { enrolledFactorId: string | null }) {
  const router = useRouter()
  const [setup, setSetup] = useState<Setup | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const started = useRef(false)

  useEffect(() => {
    if (enrolledFactorId || started.current) return
    started.current = true
    ;(async () => {
      // Abandoned, never-confirmed enrolments would block a new one, so clear them first.
      const listed = await supabase.auth.mfa.listFactors()
      for (const factor of listed.data?.all ?? []) if (factor.factor_type === 'totp' && factor.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: factor.id })
      const enrolled = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `RapidArc ${new Date().toISOString().slice(0, 10)}` })
      if (enrolled.error || !enrolled.data) { setError('Could not start two-factor setup. Make sure multi-factor authentication is enabled for this Supabase project.'); return }
      setSetup({ factorId: enrolled.data.id, qr: enrolled.data.totp.qr_code, secret: enrolled.data.totp.secret })
    })()
  }, [enrolledFactorId])

  async function verify(event: React.FormEvent) {
    event.preventDefault()
    const factorId = enrolledFactorId ?? setup?.factorId
    if (!factorId || !/^\d{6}$/.test(code)) { setError('Enter the 6-digit code from your authenticator app.'); return }
    setBusy(true); setError('')
    const result = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
    if (result.error) { setError('That code was not accepted. Wait for the next code and try again.'); setBusy(false); setCode(''); return }
    router.replace('/platform'); router.refresh()
  }

  return <form onSubmit={verify} className="p-card" style={{ maxWidth: 460, margin: '8vh auto 0' }}>
    <h1 style={{ fontSize: 22 }}>{enrolledFactorId ? 'Two-factor check' : 'Set up two-factor authentication'}</h1>
    <p className="p-muted" style={{ marginBottom: 14 }}>{enrolledFactorId ? 'Enter the code from your authenticator app to open the console.'
      : 'The platform account reaches every agency, so a second factor is required. Scan this code with an authenticator app (Google Authenticator, 1Password, Authy), then enter the 6-digit code it shows.'}</p>
    {!enrolledFactorId && (setup ? <div style={{ marginBottom: 14 }}><div className="p-qr"><img src={setup.qr} alt="Scan this code with your authenticator app" /></div>
      <p className="p-muted" style={{ marginTop: 8 }}>Can&apos;t scan? Enter this key by hand: <b style={{ wordBreak: 'break-all' }}>{setup.secret}</b></p></div> : !error && <p className="p-muted" role="status">Preparing your code…</p>)}
    <label className="p-field">6-digit code<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} /></label>
    {error && <p role="alert" className="p-error">{error}</p>}
    <button type="submit" className="p-btn" disabled={busy || (!enrolledFactorId && !setup)}>{busy ? 'Checking…' : enrolledFactorId ? 'Continue' : 'Turn on two-factor'}</button>
  </form>
}
