'use client'
import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/shared'
import { IconPlus } from '@/components/shared/icons'

type Option = { id: string; name?: string; full_name?: string; client_id?: string; title?: string; status?: string }
type Options = { clients: Option[]; cameramen: Option[]; items: Option[] }
const empty = { title: '', date: '', start: '09:00', end: '10:00', client_id: '', cameraman_id: '', location: '', content_item_ids: [] as string[] }

/** Used in the manager shell and calendar pages; options come from the signed-in user's scoped API. */
export function ScheduleShootButton({ onCreated }: { onCreated?: () => void }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<Options>({ clients: [], cameramen: [], items: [] })
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (!open) return
    void fetch('/api/shoots/options').then(async (response) => {
      if (!response.ok) throw new Error('Could not load scheduling options')
      const data = await response.json() as Options
      setOptions(data)
      setForm((old) => ({ ...old, client_id: old.client_id || data.clients[0]?.id || '', cameraman_id: old.cameraman_id || data.cameramen[0]?.id || '' }))
    }).catch((e) => setError(e instanceof Error ? e.message : 'Could not load scheduling options'))
  }, [open])
  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('')
    try {
      const response = await fetch('/api/shoots', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title, client_id: form.client_id, cameraman_id: form.cameraman_id, location: form.location,
          content_item_ids: form.content_item_ids,
          scheduled_start: new Date(`${form.date}T${form.start}:00+05:30`).toISOString(),
          scheduled_end: new Date(`${form.date}T${form.end}:00+05:30`).toISOString() }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message ?? 'Could not schedule shoot')
      setOpen(false); setForm(empty); onCreated?.(); router.refresh()
      void fetch(`/api/shoots/${data.id}/provision`, { method: 'POST' }).then(() => onCreated?.())
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not schedule shoot') }
    finally { setSaving(false) }
  }
  return <>
    <button type="button" className="btn-dark" onClick={() => { setError(''); setOpen(true) }}><IconPlus />Schedule a shoot</button>
    <Modal open={open} onClose={() => setOpen(false)} titleId="schedule-modal-title" title="Schedule a shoot" closeLabel="Close schedule shoot form"
      footer={<><button className="btn-soft" onClick={() => setOpen(false)}>Cancel</button><button className="btn-dark" form="shoot-form" disabled={saving}>{saving ? 'Scheduling…' : 'Schedule shoot'}</button></>}>
      <form id="shoot-form" onSubmit={(e) => void save(e)}>
        <div className="field"><label htmlFor="sf-title">Shoot title <span className="req">*</span></label><input id="sf-title" required placeholder="e.g. Diwali campaign reels" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div className="field-row"><div className="field"><label htmlFor="sf-client">Client <span className="req">*</span></label><select id="sf-client" required value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value, content_item_ids: [] })}>{options.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div className="field"><label htmlFor="sf-camera">Cameraman <span className="req">*</span></label><select id="sf-camera" required value={form.cameraman_id} onChange={(e) => setForm({ ...form, cameraman_id: e.target.value })}>{options.cameramen.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}</select></div></div>
        <div className="field-row"><div className="field"><label htmlFor="sf-date">Date (IST) <span className="req">*</span></label><input id="sf-date" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div><div className="field"><label htmlFor="sf-location">Location</label><input id="sf-location" placeholder="Enter address (optional)" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div></div>
        <div className="field-row"><div className="field"><label htmlFor="sf-start">Start time (IST) <span className="req">*</span></label><input id="sf-start" type="time" required value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></div><div className="field"><label htmlFor="sf-end">End time (IST) <span className="req">*</span></label><input id="sf-end" type="time" required value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></div></div>
        <div className="field"><label>Content ideas to cover</label><div className="check-list">{options.items.filter((item) => item.client_id === form.client_id).map((item) => <label className="check-row" key={item.id}><input type="checkbox" checked={form.content_item_ids.includes(item.id)} onChange={(e) => setForm({ ...form, content_item_ids: e.target.checked ? [...form.content_item_ids, item.id] : form.content_item_ids.filter((id) => id !== item.id) })} />{item.title} · {item.status}</label>)}{!options.items.some((item) => item.client_id === form.client_id) && <p>No approved ideas for this client yet. Approve a monthly plan first.</p>}</div></div>
        {error && <p role="alert">{error}</p>}
      </form>
    </Modal>
  </>
}
