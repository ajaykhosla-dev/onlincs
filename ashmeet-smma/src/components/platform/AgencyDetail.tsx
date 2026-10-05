'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { formatBytes } from '@/lib/storage/constants'
import type { AgencyRow, Usage } from '@/lib/platform/agencies'
import type { IntegrationSummary, TestStep } from '@/lib/platform/integrations'

type Trail = { id: string; action: string; created_at: string; metadata: unknown }
const when = (value: string) => new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
async function call(url: string, method: string, body?: unknown) {
  const response = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.message ?? 'That did not work')
  return payload
}

export function AgencyDetail({ agency, usage, integrations, trail }: { agency: AgencyRow; usage: Usage; integrations: IntegrationSummary; trail: Trail[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [profile, setProfile] = useState({ name: agency.name, display_name: agency.display_name ?? '', phone: agency.phone ?? '', address: agency.address ?? '',
    services: agency.services ?? '', notes: agency.notes ?? '', plan: agency.plan, logo_url: agency.logo_url ?? '' })
  const [creds, setCreds] = useState({ drive_service_account_key: '', drive_service_account_email: '', shared_drive_id: '', b2_bucket: '', b2_prefix: integrations.b2.prefix ?? '', b2_endpoint: '', b2_region: '', b2_key_id: '', b2_application_key: '' })
  const [steps, setSteps] = useState<TestStep[] | null>((integrations.last_test as TestStep[] | null) ?? null)
  const [reason, setReason] = useState('')
  const [suspendReason, setSuspendReason] = useState('')

  async function run(label: string, work: () => Promise<string | void>) {
    setBusy(label); setMessage(null)
    try { const text = await work(); if (text) setMessage({ kind: 'ok', text }); router.refresh() }
    catch (cause) { setMessage({ kind: 'error', text: cause instanceof Error ? cause.message : 'That did not work' }) }
    finally { setBusy('') }
  }
  const field = (key: keyof typeof profile) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setProfile({ ...profile, [key]: event.target.value })
  const cred = (key: keyof typeof creds) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setCreds({ ...creds, [key]: event.target.value })
  const suspended = agency.status === 'suspended'

  return <>
    <div className="p-row" style={{ justifyContent: 'space-between' }}>
      <div><h1>{agency.display_name || agency.name}</h1>
        <p className="p-muted">{agency.slug} · {agency.id} · <span className={`p-pill ${agency.status === 'active' ? 'ok' : suspended ? 'bad' : 'warn'}`}>{agency.status}</span>
          {suspended && agency.suspended_reason ? ` · ${agency.suspended_reason}` : ''}</p></div>
    </div>
    {message && <p role={message.kind === 'error' ? 'alert' : 'status'} className={message.kind === 'error' ? 'p-error' : 'p-ok'}>{message.text}</p>}

    <section className="p-card"><h2>Usage</h2>
      <div className="p-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
        {([['Clients', usage.clients], ['Users', usage.users], ['Content items', usage.content_items], ['Planned this month', usage.items_this_month], ['Raw storage', formatBytes(usage.storage_bytes)]] as const).map(([label, value]) =>
          <div key={label}><div className="p-muted">{label}</div><div style={{ fontSize: 24, fontWeight: 800 }}>{value}</div></div>)}
      </div></section>

    <form className="p-card" onSubmit={(event) => { event.preventDefault(); void run('profile', async () => { await call(`/api/platform/agencies/${agency.id}`, 'PATCH', profile); return 'Details saved.' }) }}>
      <h2>Details and branding</h2>
      <div className="p-grid">
        <label className="p-field">Agency name<input value={profile.name} onChange={field('name')} /></label>
        <label className="p-field">Display name (shown to its team)<input value={profile.display_name} onChange={field('display_name')} /></label>
        <label className="p-field">Logo link (https image)<input value={profile.logo_url} onChange={field('logo_url')} placeholder="https://…" /></label>
        <label className="p-field">Plan<select value={profile.plan} onChange={field('plan')}><option value="trial">Trial</option><option value="standard">Standard</option><option value="pro">Pro</option></select></label>
        <label className="p-field">Phone<input value={profile.phone} onChange={field('phone')} /></label>
        <label className="p-field">Address<input value={profile.address} onChange={field('address')} /></label>
      </div>
      <label className="p-field">Services<input value={profile.services} onChange={field('services')} /></label>
      <label className="p-field">Notes<textarea value={profile.notes} onChange={field('notes')} /></label>
      <div className="p-row"><button type="submit" className="p-btn" disabled={!!busy}>{busy === 'profile' ? 'Saving…' : 'Save details'}</button>
        <button type="button" className="p-btn ghost" disabled={!!busy} onClick={() => void run('invite', async () => { const r = await call(`/api/platform/agencies/${agency.id}/invite`, 'POST'); return r.emailSent ? 'Invitation sent.' : r.note ?? 'Sign-in identity is ready.' })}>Resend admin invite</button></div>
    </form>

    <form className="p-card" onSubmit={(event) => { event.preventDefault(); void run('creds', async () => {
      const r = await call(`/api/platform/agencies/${agency.id}/integrations`, 'PUT', Object.fromEntries(Object.entries(creds).filter(([, v]) => v !== '')))
      setCreds({ ...creds, drive_service_account_key: '', b2_key_id: '', b2_application_key: '' })
      return `Saved ${[...r.changed, ...r.rotated].join(', ')}. Run the connection test to confirm it works.` }) }}>
      <h2>Credentials</h2>
      <p className="p-muted" style={{ marginBottom: 12 }}>Write-only. Values are encrypted before they are stored and can never be shown again, only replaced. Leave a field empty to keep what is stored.
        {integrations.uses_environment_fallback && ' Until both are set here, this agency uses the platform environment credentials (only the original Ashmeet workspace is allowed to).'}</p>
      <div className="p-grid">
        <label className="p-field">Drive service account key (paste the JSON file or just the private key)<textarea value={creds.drive_service_account_key} onChange={cred('drive_service_account_key')} placeholder={integrations.drive.key_set ? `Stored: ${integrations.drive.key_fingerprint ?? 'set'} (paste to replace)` : 'Paste the key'} /></label>
        <div>
          <label className="p-field">Service account email<input value={creds.drive_service_account_email} onChange={cred('drive_service_account_email')} placeholder={integrations.drive.email ?? ''} /></label>
          <label className="p-field">Shared Drive ID<input value={creds.shared_drive_id} onChange={cred('shared_drive_id')} placeholder={integrations.drive.shared_drive_id ?? ''} /></label>
        </div>
        <label className="p-field">B2 bucket<input value={creds.b2_bucket} onChange={cred('b2_bucket')} placeholder={integrations.b2.bucket ?? ''} /></label>
        <label className="p-field">B2 prefix (this agency&apos;s id, e.g. {agency.id}/)<input value={creds.b2_prefix} onChange={cred('b2_prefix')} /></label>
        <label className="p-field">B2 S3 endpoint<input value={creds.b2_endpoint} onChange={cred('b2_endpoint')} placeholder={integrations.b2.endpoint ?? 'https://s3.eu-central-003.backblazeb2.com'} /></label>
        <label className="p-field">B2 region<input value={creds.b2_region} onChange={cred('b2_region')} placeholder={integrations.b2.region ?? 'eu-central-003'} /></label>
        <label className="p-field">B2 key ID<input value={creds.b2_key_id} onChange={cred('b2_key_id')} autoComplete="off" placeholder={integrations.b2.key_id_last4 ? `Stored: …${integrations.b2.key_id_last4}` : ''} /></label>
        <label className="p-field">B2 application key<input type="password" value={creds.b2_application_key} onChange={cred('b2_application_key')} autoComplete="new-password" placeholder={integrations.b2.app_key_last4 ? `Stored: …${integrations.b2.app_key_last4}` : ''} /></label>
      </div>
      <div className="p-row"><button type="submit" className="p-btn" disabled={!!busy}>{busy === 'creds' ? 'Saving…' : 'Save credentials'}</button>
        <button type="button" className="p-btn ghost" disabled={!!busy} onClick={() => void run('test', async () => { const r = await call(`/api/platform/agencies/${agency.id}/integrations`, 'POST'); setSteps(r.steps); return r.ok ? 'All checks passed.' : 'Some checks failed. See below.' })}>{busy === 'test' ? 'Testing…' : 'Test connection'}</button></div>
      {steps && <div style={{ marginTop: 14 }}>{steps.map((step, index) => <div key={index} className="p-step">
        <span className={`p-pill ${step.status === 'pass' ? 'ok' : step.status === 'fail' ? 'bad' : 'warn'}`}>{step.status}</span>
        <div><b>{step.service}: {step.name}</b><div className="p-muted">{step.detail}</div></div></div>)}</div>}
    </form>

    <section className="p-card"><h2>Support access</h2>
      <p className="p-muted" style={{ marginBottom: 10 }}>Opens this agency&apos;s workspace read-only so you can see what they see. A banner stays on every screen, and the entry and exit (with duration) appear in the agency admin&apos;s own audit trail.</p>
      <label className="p-field">Reason (recorded)<input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="e.g. Ticket 42: uploads not showing" /></label>
      <button type="button" className="p-btn" disabled={!!busy || reason.trim().length < 3 || suspended} onClick={() => void run('support', async () => {
        const r = await call('/api/platform/support', 'POST', { action: 'enter', agencyId: agency.id, reason }); window.location.assign(r.redirect) })}>Open agency (read-only)</button>
      {suspended && <p className="p-muted" style={{ marginTop: 8 }}>This agency is suspended. Reactivate it to open its workspace.</p>}
    </section>

    <section className="p-card"><h2>Lifecycle and data</h2>
      <p className="p-muted" style={{ marginBottom: 10 }}>{suspended ? 'Reactivating restores sign-in for every user at once.' : 'Suspending blocks every user of this agency from signing in. Nothing is deleted, and reactivation is instant.'}</p>
      {!suspended && <label className="p-field">Reason<input value={suspendReason} onChange={(event) => setSuspendReason(event.target.value)} placeholder="e.g. Unpaid invoice" /></label>}
      <div className="p-row">
        {suspended
          ? <button type="button" className="p-btn" disabled={!!busy} onClick={() => void run('status', async () => { await call(`/api/platform/agencies/${agency.id}/status`, 'POST', { status: 'active' }); return 'Agency reactivated.' })}>Reactivate</button>
          : <button type="button" className="p-btn danger" disabled={!!busy || suspendReason.trim().length < 3} onClick={() => { if (window.confirm(`Suspend ${agency.name}? Nobody in this agency will be able to sign in.`)) void run('status', async () => { await call(`/api/platform/agencies/${agency.id}/status`, 'POST', { status: 'suspended', reason: suspendReason }); return 'Agency suspended.' }) }}>Suspend</button>}
        <a className="p-btn ghost" href={`/api/platform/agencies/${agency.id}/export`} style={{ textDecoration: 'none' }}>Download all data (JSON)</a>
      </div></section>

    <section className="p-card"><h2>Platform activity for this agency</h2>
      {!trail.length ? <p className="p-muted">Nothing yet.</p> : <table className="p-table"><tbody>{trail.map((entry) => <tr key={entry.id}><td>{when(entry.created_at)}</td><td>{entry.action.replaceAll('_', ' ')}</td></tr>)}</tbody></table>}
    </section>
  </>
}
