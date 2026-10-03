'use client'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { MonthGrid } from './MonthGrid'
import { Modal, Tag } from '@/components/shared'
import { allowedTransitions } from '@/lib/pipeline/policy'
import type { Client, ContentItem, ContentStatus, ContentType, MonthlyPlan, PlanStatus } from '@/types/database'

type ClientOption = Pick<Client, 'id' | 'name'>
type Form = { title: string; type: ContentType; concept: string; script: string; instructions_editor: string; instructions_cameraman: string; reference_links: string; planned_date: string; planned_time: string; assigned_editor_id: string; deadline: string }
const blank = (date: string): Form => ({ title: '', type: 'reel', concept: '', script: '', instructions_editor: '', instructions_cameraman: '', reference_links: '', planned_date: date, planned_time: '10:00', assigned_editor_id: '', deadline: '' })
const label = (status: string) => status.replaceAll('_', ' ')
const tone: Record<ContentStatus, 'grey' | 'lav' | 'amber' | 'pink' | 'mint' | 'sky'> = {
  planned: 'grey', calendar_approved: 'lav', shoot_scheduled: 'sky', raw_uploaded: 'sky', with_editor: 'lav',
  cut_submitted: 'amber', changes_requested: 'pink', internally_approved: 'mint', with_client: 'amber',
  client_changes: 'pink', client_approved: 'mint', scheduled: 'sky', posted: 'mint', archived: 'grey',
}
const planMoves: Record<PlanStatus, PlanStatus[]> = {
  draft: ['draft', 'sent_to_client'],
  sent_to_client: ['sent_to_client', 'approved', 'changes_requested'],
  approved: ['approved', 'changes_requested'],
  changes_requested: ['changes_requested', 'draft', 'sent_to_client'],
}
function shiftMonth(month: string, offset: number) { const [year, index] = month.split('-').map(Number); return new Date(Date.UTC(year, index - 1 + offset, 1)).toISOString().slice(0, 7) }

export function LivePlanner() {
  const [clients, setClients] = useState<ClientOption[]>([])
  const [clientId, setClientId] = useState('')
  const [month, setMonth] = useState('2026-09')
  const [items, setItems] = useState<ContentItem[]>([])
  const [plan, setPlan] = useState<MonthlyPlan | null>(null)
  const [view, setView] = useState<'calendar' | 'list'>('calendar')
  const [day, setDay] = useState(1)
  const [editing, setEditing] = useState<ContentItem | null>(null)
  const [form, setForm] = useState<Form>(blank('2026-09-01'))
  const [modal, setModal] = useState(false)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => { void (async () => {
    try { const res = await fetch('/api/clients?month=' + month); if (!res.ok) throw new Error('Could not load clients'); const data = await res.json(); setClients(data.clients); setClientId((old) => data.clients.some((c: ClientOption) => c.id === old) ? old : (data.clients[0]?.id ?? '')) }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load clients'); setLoading(false) }
  })() }, [month])
  const load = useCallback(async () => {
    if (!clientId) { setItems([]); setPlan(null); setLoading(false); return }
    setLoading(true); setError('')
    try { const res = await fetch(`/api/clients/${clientId}/content?month=${month}`, { cache: 'no-store' }); if (!res.ok) throw new Error('Could not load planner'); const data = await res.json(); setItems(data.items); setPlan(data.plan) }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load planner') }
    finally { setLoading(false) }
  }, [clientId, month])
  useEffect(() => { queueMicrotask(() => void load()) }, [load])
  const [year, index] = month.split('-').map(Number)
  const selected = items.filter((item) => Number(item.planned_date?.slice(-2)) === day)
  function openCreate(date: string) { setEditing(null); setForm(blank(date)); setModal(true) }
  function openEdit(item: ContentItem) { setEditing(item); setForm({ title: item.title, type: item.type, concept: item.concept ?? '', script: item.script ?? '', instructions_editor: item.instructions_editor ?? '', instructions_cameraman: item.instructions_cameraman ?? '', reference_links: (item.reference_links ?? []).join('\n'), planned_date: item.planned_date ?? `${month}-01`, planned_time: item.planned_time ?? '', assigned_editor_id: item.assigned_editor_id ?? '', deadline: item.deadline ?? '' }); setModal(true) }
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const res = await fetch(`/api/clients/${clientId}/content${editing ? `/${editing.id}` : ''}`, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, reference_links: form.reference_links.split(/\s+/).filter(Boolean), assigned_editor_id: form.assigned_editor_id || null, deadline: form.deadline || null }) })
      if (!res.ok) throw new Error((await res.json()).message ?? 'Could not save content item')
      setModal(false); await load()
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save content item') }
    finally { setBusy(false) }
  }
  async function changeStatus(status: PlanStatus) {
    setBusy(true); setError('')
    try { const res = await fetch(`/api/clients/${clientId}/plans?month=${month}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); if (!res.ok) throw new Error((await res.json()).message ?? 'Could not update plan'); await load() }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not update plan') }
    finally { setBusy(false) }
  }
  async function archive(item: ContentItem) {
    if (!window.confirm(`Archive ${item.title}?`)) return
    setBusy(true); setError('')
    try { const res = await fetch(`/api/clients/${clientId}/content/${item.id}`, { method: 'DELETE' }); if (!res.ok) throw new Error((await res.json()).message ?? 'Could not archive content item'); setModal(false); await load() }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not archive content item') }
    finally { setBusy(false) }
  }
  async function changeItemStatus(item: ContentItem, toStatus: ContentStatus) {
    if (toStatus === item.status) return
    setBusy(true); setError('')
    try {
      const res = await fetch(`/api/clients/${clientId}/content/${item.id}/status`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ toStatus }),
      })
      if (!res.ok) throw new Error((await res.json()).message ?? 'Could not change status')
      setModal(false); await load()
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not change status') }
    finally { setBusy(false) }
  }
  const days = Object.fromEntries(Array.from({ length: new Date(year, index, 0).getDate() }, (_, i) => {
    const d = i + 1, date = `${month}-${String(d).padStart(2, '0')}`, entries = items.filter((item) => item.planned_date === date)
    return [d, { onClick: () => setDay(d), interactiveChildren: true, ariaLabel: `${date}: ${entries.length} content items`, children: <div style={{ display: 'grid', gap: 2 }}>{entries.map((item) => <button type="button" key={item.id} className="cal-chip c--ram" title={`${item.title} · ${label(item.status)}`} onClick={() => { setDay(d); openEdit(item) }}>{item.type}: {item.title}</button>)}</div> }]
  }))
  return <>
    <section className="hero-row" style={{ gridTemplateColumns: '1fr' }}><div className="hello"><h1>Content planner<span className="light">Plan the month before you shoot it</span></h1><p>Choose a client and month to see live content ideas.</p></div></section>
    <section className="card" style={{ padding: 20 }}><div className="card-head" style={{ padding: 0 }}><div className="card-tools" style={{ gap: 10 }}><label>Client <select value={clientId} onChange={(e) => setClientId(e.target.value)}>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label><button className="tool" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}>‹</button><strong>{new Date(Date.UTC(year, index - 1, 1)).toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</strong><button className="tool" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))}>›</button></div><div className="card-tools"><Tag variant={plan?.status === 'approved' ? 'mint' : 'grey'}>{label(plan?.status ?? 'draft')}</Tag><select aria-label="Plan status" disabled={!clientId || busy} value={plan?.status ?? 'draft'} onChange={(e) => void changeStatus(e.target.value as PlanStatus)}>{planMoves[plan?.status ?? 'draft'].map((s) => <option key={s} value={s}>{label(s)}</option>)}</select><div className="seg"><button className={view === 'calendar' ? 'is-active' : ''} onClick={() => setView('calendar')}>Calendar</button><button className={view === 'list' ? 'is-active' : ''} onClick={() => setView('list')}>List</button></div></div></div></section>
    {error && !modal && <section className="card" style={{ padding: 20 }} role="alert">{error} <button onClick={() => void load()}>Retry</button></section>}
    {loading ? <section className="card" style={{ padding: 20 }} role="status">Loading planner…</section> : !clientId ? <section className="card" style={{ padding: 20 }}>No clients assigned.</section> : <div className="grid"><section className="card" style={{ padding: 22 }}>{items.length === 0 && <p>No content planned for this month.</p>}{view === 'calendar' ? <MonthGrid year={year} month={index - 1} days={days} /> : <div className="queue">{items.map((item) => <button key={item.id} type="button" className="queue-item" onClick={() => openEdit(item)} style={{ textAlign: 'left', width: '100%' }}><div className="queue-body"><strong>{item.planned_date} · {item.title}</strong><div className="queue-meta">{item.type} · {label(item.status)}</div></div><Tag variant={tone[item.status]}>{label(item.status)}</Tag></button>)}</div>}</section><aside className="side"><section className="card queue"><div className="card-head" style={{ padding: 0 }}><div className="card-title">{day} {new Date(Date.UTC(year, index - 1, 1)).toLocaleString('en-IN', { month: 'long', timeZone: 'UTC' })}</div></div>{selected.length ? selected.map((item) => <button key={item.id} type="button" className="queue-item" onClick={() => openEdit(item)} style={{ width: '100%', textAlign: 'left' }}><div className="queue-body"><strong>{item.title}</strong><div className="queue-meta">{item.type} · {label(item.status)}</div></div><Tag variant={tone[item.status]}>{label(item.status)}</Tag></button>) : <p>Nothing planned for {day} {new Date(Date.UTC(year, index - 1, 1)).toLocaleString('en-IN', { month: 'long', timeZone: 'UTC' })}.</p>}<button className="btn-dark" onClick={() => openCreate(`${month}-${String(day).padStart(2, '0')}`)}>Plan</button></section></aside></div>}
    <Modal open={modal} onClose={() => setModal(false)} titleId="content-form-title" title={editing ? 'Edit content item' : 'Plan content'} closeLabel="Close content form" footer={<><button className="btn-soft" onClick={() => setModal(false)}>Cancel</button>{editing && <button className="btn-soft" disabled={busy} onClick={() => void archive(editing)}>Archive</button>}<button className="btn-dark" form="content-form" disabled={busy}>{busy ? 'Saving…' : 'Save plan'}</button></>}><form id="content-form" onSubmit={(e) => void save(e)}>
      <div className="field"><label htmlFor="content-title">Idea name</label><input id="content-title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
      <div className="field"><label htmlFor="content-type">Type</label><select id="content-type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ContentType })}>{['reel','post','carousel','story'].map((type) => <option key={type} value={type}>{type}</option>)}</select></div>
      <div className="field"><label htmlFor="content-date">Date</label><input id="content-date" type="date" required value={form.planned_date} onChange={(e) => setForm({ ...form, planned_date: e.target.value })} /></div><div className="field"><label htmlFor="content-time">Time</label><input id="content-time" type="time" value={form.planned_time} onChange={(e) => setForm({ ...form, planned_time: e.target.value })} /></div>
      {(['concept','script','instructions_editor','instructions_cameraman','reference_links'] as const).map((field) => <div className="field" key={field}><label htmlFor={`content-${field}`}>{field === 'reference_links' ? 'Reference and image links (one per line)' : label(field)}</label><textarea id={`content-${field}`} value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} /></div>)}
      <div className="field"><label htmlFor="content-deadline">Deadline</label><input id="content-deadline" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div>
      <div className="field"><label htmlFor="content-status">Status {editing && '(changes immediately)'}</label>{editing ? <select id="content-status" value={editing.status} disabled={busy} onChange={(e) => void changeItemStatus(editing, e.target.value as ContentStatus)}>{[editing.status, ...allowedTransitions[editing.status]].map((status) => <option key={status} value={status}>{label(status)}</option>)}</select> : <input id="content-status" readOnly value="planned" />}</div>
      {error && <p role="alert">{error}</p>}
    </form></Modal>
  </>
}
