'use client'
import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '@/components/shared'
import type { Client, ClientScope, ClientStatus } from '@/types/database'

export type ClientRow = Client & { scope: ClientScope | null; delivered: number }
export type ClientManager = { id: string; full_name: string }
const empty = { code: '', name: '', handle: '', niche: '', manager_id: '', status: 'onboarding' as ClientStatus, reel_count: 0, post_count: 0, carousel_count: 0, story_count: 0 }

/** Add or edit a client. Usable from any admin page; `onSaved` lets the caller refresh its own data. */
export function ClientFormModal({ open, onClose, editing, managers, onSaved }: {
  open: boolean; onClose: () => void; editing: ClientRow | null; managers: ClientManager[]; onSaved: () => void
}) {
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!open) return
    queueMicrotask(() => {
      setError('')
      setForm(editing ? { code: editing.code, name: editing.name, handle: editing.handle, niche: editing.niche, manager_id: editing.manager_id,
        status: editing.status, reel_count: editing.scope?.reel_count ?? 0, post_count: editing.scope?.post_count ?? 0,
        carousel_count: editing.scope?.carousel_count ?? 0, story_count: editing.scope?.story_count ?? 0 } : { ...empty, manager_id: managers[0]?.id ?? '' })
    })
  }, [open, editing, managers])
  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('')
    const { reel_count, post_count, carousel_count, story_count, ...client } = form
    try {
      const response = await fetch(editing ? `/api/clients/${editing.id}` : '/api/clients', {
        method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...client, scope: { reel_count, post_count, carousel_count, story_count } }),
      })
      if (!response.ok) throw new Error((await response.json()).message ?? 'Could not save client')
      onClose(); onSaved()
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save client') }
    finally { setSaving(false) }
  }
  // Only mounted while open: the Clients page and the top bar each own one, and their form ids must not collide.
  if (!open) return null
  return <Modal open={open} onClose={onClose} titleId="client-form-title" title={editing ? `Edit ${editing.name}` : 'Add client'} closeLabel="Close client form" footer={<><button className="btn-soft" onClick={onClose}>Cancel</button><button className="btn-dark" form="client-form" disabled={saving}>{saving ? 'Saving…' : 'Save client'}</button></>}>
    <form id="client-form" onSubmit={(e) => void save(e)}>
      <div className="field-row">{([['code','Code','e.g. RAM-01'],['handle','Handle','@instagram_handle']] as const).map(([field, label, ph]) => <div className="field" key={field}><label htmlFor={`client-${field}`}>{label} <span className="req">*</span></label><input id={`client-${field}`} value={form[field]} placeholder={ph} required disabled={field === 'code' && !!editing} onChange={(e) => setForm({ ...form, [field]: e.target.value })} /></div>)}</div>
      <div className="field"><label htmlFor="client-name">Name <span className="req">*</span></label><input id="client-name" value={form.name} placeholder="Client or brand name" required onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
      <div className="field-row">
        <div className="field"><label htmlFor="client-niche">Niche <span className="req">*</span></label><input id="client-niche" value={form.niche} placeholder="e.g. Healthcare" required onChange={(e) => setForm({ ...form, niche: e.target.value })} /></div>
        <div className="field"><label htmlFor="client-status">Status</label><select id="client-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ClientStatus })}>{['onboarding','active','paused','churned'].map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
      </div>
      <div className="field"><label htmlFor="client-manager">Brand Manager</label><select id="client-manager" value={form.manager_id} onChange={(e) => setForm({ ...form, manager_id: e.target.value })}>{managers.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}</select></div>
      {!editing && <><strong style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Monthly scope of work</strong><div className="field-row-4">{([['reel_count','Reels'],['post_count','Posts'],['carousel_count','Carousels'],['story_count','Stories']] as const).map(([field, label]) => <div className="field" key={field}><label htmlFor={`client-${field}`}>{label}</label><input id={`client-${field}`} type="number" min="0" value={form[field]} onChange={(e) => setForm({ ...form, [field]: Number(e.target.value) })} /></div>)}</div></>}
      {error && <p role="alert">{error}</p>}
    </form>
  </Modal>
}
