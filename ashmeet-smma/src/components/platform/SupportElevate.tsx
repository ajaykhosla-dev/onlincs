'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/** Writes are blocked in a support session until the owner explicitly asks for them, with a reason, for 15 minutes. */
export function SupportElevate() {
  const router = useRouter()
  const [error, setError] = useState('')
  async function elevate() {
    const reason = window.prompt('Why do you need to make a change? This is recorded in the agency\'s audit trail. Changes stay on for 15 minutes.')
    if (!reason) return
    const response = await fetch('/api/platform/support', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'elevate', reason }) })
    if (!response.ok) { setError((await response.json().catch(() => ({}))).message ?? 'Could not enable changes'); return }
    router.refresh()
  }
  return <>
    <button type="button" className="sb-ghost" onClick={() => void elevate()}>Enable changes for 15 min</button>
    {error && <span role="alert">{error}</span>}
  </>
}
