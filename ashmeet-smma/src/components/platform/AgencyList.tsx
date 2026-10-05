'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { formatBytes } from '@/lib/storage/constants'
import type { AgencyRow, Usage } from '@/lib/platform/agencies'

type Row = AgencyRow & { usage: Usage }
const empty = { name: '', slug: '', plan: 'standard', phone: '', address: '', services: '', notes: '', adminEmail: '', adminName: '' }

export function AgencyList({ agencies }: { agencies: Row[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(empty)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState('')

  async function create(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setResult('')
    try {
      const response = await fetch('/api/platform/agencies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, slug: form.slug || undefined }) })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.message ?? 'Could not create the agency')
      const invite = payload.invite
      setResult(invite?.error ?? (invite?.emailSent ? 'Agency created and the invitation was sent.' : `Agency created. ${invite?.note ?? ''}`))
      setForm(empty); router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create the agency') }
    finally { setBusy(false) }
  }
  const set = (key: keyof typeof empty) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, [key]: event.target.value })

  return <>
    <div className="p-row" style={{ justifyContent: 'space-between' }}>
      <div><h1>Agencies</h1><p className="p-muted">Every tenant on the platform. Open one to manage its details, credentials and access.</p></div>
      <button type="button" className="p-btn" onClick={() => setOpen(!open)}>{open ? 'Close' : 'Onboard an agency'}</button>
    </div>

    {open && <form className="p-card" onSubmit={create}>
      <h2>Onboard a new agency</h2>
      <div className="p-grid">
        <label className="p-field">Agency name<input required value={form.name} onChange={set('name')} /></label>
        <label className="p-field">Short name (optional)<input value={form.slug} onChange={set('slug')} placeholder="made from the name if empty" /></label>
        <label className="p-field">Plan<select value={form.plan} onChange={set('plan')}><option value="trial">Trial</option><option value="standard">Standard</option><option value="pro">Pro</option></select></label>
        <label className="p-field">Phone<input value={form.phone} onChange={set('phone')} /></label>
        <label className="p-field">Address<input value={form.address} onChange={set('address')} /></label>
        <label className="p-field">Services<input value={form.services} onChange={set('services')} placeholder="e.g. social media, shoots, reels" /></label>
        <label className="p-field">Admin name<input required value={form.adminName} onChange={set('adminName')} /></label>
        <label className="p-field">Admin Gmail<input required type="email" value={form.adminEmail} onChange={set('adminEmail')} /></label>
      </div>
      <label className="p-field">Notes<textarea value={form.notes} onChange={set('notes')} /></label>
      <p className="p-muted" style={{ marginBottom: 10 }}>Creating the agency adds an empty workspace and invites the admin, who signs in with that Google account.</p>
      {error && <p role="alert" className="p-error">{error}</p>}
      {result && <p role="status" className="p-ok">{result}</p>}
      <button type="submit" className="p-btn" disabled={busy}>{busy ? 'Creating…' : 'Create agency and invite admin'}</button>
    </form>}

    <section className="p-card" style={{ overflowX: 'auto' }}>
      <table className="p-table">
        <thead><tr><th>Agency</th><th>Plan</th><th>Status</th><th>Clients</th><th>Users</th><th>Storage</th><th>Created</th></tr></thead>
        <tbody>{agencies.map((agency) => <tr key={agency.id}>
          <td><Link href={`/platform/agencies/${agency.id}`}>{agency.display_name || agency.name}</Link><div className="p-muted">{agency.slug}</div></td>
          <td>{agency.plan}</td>
          <td><span className={`p-pill ${agency.status === 'active' ? 'ok' : agency.status === 'suspended' ? 'bad' : 'warn'}`}>{agency.status}</span></td>
          <td>{agency.usage.clients}</td><td>{agency.usage.users}</td><td>{formatBytes(agency.usage.storage_bytes)}</td>
          <td>{new Date(agency.created_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })}</td>
        </tr>)}</tbody>
      </table>
      {!agencies.length && <p className="p-muted" style={{ padding: 12 }}>No agencies yet.</p>}
    </section>
  </>
}
