'use client'
import { useState, type FormEvent } from 'react'
import type { ShootView } from '@/lib/phase4/data'
import { Modal } from '@/components/shared'

const istLocal = (utc: string) => new Date(utc).toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata', hour12: false }).replace(' ', 'T').slice(0, 16)

export function EditShootButton({ shoot, cameramen, onSaved }: { shoot: ShootView; cameramen: { id: string; full_name: string }[]; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: shoot.title, start: istLocal(shoot.scheduled_start), end: istLocal(shoot.scheduled_end),
    location: shoot.location ?? '', cameraman_id: shoot.cameraman_id })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('')
    try {
      const response = await fetch(`/api/shoots/${shoot.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        title: form.title, scheduled_start: new Date(`${form.start}:00+05:30`).toISOString(), scheduled_end: new Date(`${form.end}:00+05:30`).toISOString(),
        location: form.location, cameraman_id: form.cameraman_id,
      }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message ?? 'Could not update shoot')
      setOpen(false); onSaved()
      void fetch(`/api/shoots/${shoot.id}/provision`, { method: 'POST' }).then(onSaved)
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update shoot') }
    finally { setSaving(false) }
  }
  return <><button className="btn-soft" onClick={() => setOpen(true)}>Edit shoot</button><Modal open={open} onClose={() => setOpen(false)} titleId="edit-shoot-title" title="Edit shoot" closeLabel="Close edit shoot" footer={<button className="btn-dark" form="edit-shoot-form" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>}><form id="edit-shoot-form" onSubmit={(e) => void save(e)}>
    <div className="field"><label htmlFor="es-title">Title <span className="req">*</span></label><input id="es-title" required placeholder="Shoot title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
    <div className="field-row"><div className="field"><label htmlFor="es-start">Start (IST) <span className="req">*</span></label><input id="es-start" required type="datetime-local" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></div>
    <div className="field"><label htmlFor="es-end">End (IST) <span className="req">*</span></label><input id="es-end" required type="datetime-local" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></div></div>
    <div className="field-row"><div className="field"><label htmlFor="es-location">Location</label><input id="es-location" placeholder="Enter address (optional)" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
    <div className="field"><label htmlFor="es-camera">Cameraman <span className="req">*</span></label><select id="es-camera" value={form.cameraman_id ?? ''} onChange={(e) => setForm({ ...form, cameraman_id: e.target.value })}>{cameramen.map((camera) => <option value={camera.id} key={camera.id}>{camera.full_name}</option>)}</select></div></div>
    {error && <p role="alert">{error}</p>}
  </form></Modal></>
}
