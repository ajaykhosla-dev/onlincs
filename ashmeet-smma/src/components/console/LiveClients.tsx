'use client'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Modal, ProgressBar, Tag } from '@/components/shared'
import type { Client, ClientScope, ClientStatus } from '@/types/database'

type Row = Client & { scope: ClientScope | null; delivered: number }
type Manager = { id: string; full_name: string }
const initialMonth = '2026-09' // seeded planning month; the picker can select any month
const empty = { code: '', name: '', handle: '', niche: '', manager_id: '', status: 'onboarding' as ClientStatus, reel_count: 0, post_count: 0, carousel_count: 0, story_count: 0 }

export function LiveClients({ admin }: { admin: boolean }) {
  const [month, setMonth] = useState(initialMonth)
  const [rows, setRows] = useState<Row[]>([])
  const [managers, setManagers] = useState<Manager[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Row | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const response = await fetch(`/api/clients?month=${month}`, { cache: 'no-store' })
      if (!response.ok) throw new Error('Could not load clients')
      const data = await response.json()
      setRows(data.clients); setManagers(data.managers)
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load clients') }
    finally { setLoading(false) }
  }, [month])
  useEffect(() => { queueMicrotask(() => void load()) }, [load])
  useEffect(() => {
    if (!admin) return
    const openAdd = () => { setEditing(null); setForm({ ...empty, manager_id: managers[0]?.id ?? '' }); setOpen(true) }
    window.addEventListener('open-add-client', openAdd)
    if (new URLSearchParams(window.location.search).has('add') && managers.length) {
      window.history.replaceState(null, '', '/admin/clients')
      queueMicrotask(openAdd)
    }
    return () => window.removeEventListener('open-add-client', openAdd)
  }, [admin, managers])
  function openForm(row?: Row) {
    setEditing(row ?? null)
    setForm(row ? { code: row.code, name: row.name, handle: row.handle, niche: row.niche, manager_id: row.manager_id,
      status: row.status, reel_count: row.scope?.reel_count ?? 0, post_count: row.scope?.post_count ?? 0,
      carousel_count: row.scope?.carousel_count ?? 0, story_count: row.scope?.story_count ?? 0 } : { ...empty, manager_id: managers[0]?.id ?? '' })
    setOpen(true)
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('')
    const { reel_count, post_count, carousel_count, story_count, ...client } = form
    try {
      const response = await fetch(editing ? `/api/clients/${editing.id}` : '/api/clients', {
        method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...client, scope: { reel_count, post_count, carousel_count, story_count } }),
      })
      if (!response.ok) throw new Error((await response.json()).message ?? 'Could not save client')
      setOpen(false)
      const savedMonth = new Date().toISOString().slice(0, 7)
      if (editing || savedMonth === month) await load()
      else setMonth(savedMonth)
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save client') }
    finally { setSaving(false) }
  }
  return <>
    <section className="hero-row" style={{ gridTemplateColumns: '1fr' }}><div className="hello"><h1>{admin ? 'Clients' : 'Your clients'}<span className="light">Scope of work and account details</span></h1><p>{rows.length} client{rows.length === 1 ? '' : 's'} in your workspace</p></div></section>
    <section className="card" style={{ padding: 24 }}>
      <div className="card-head" style={{ padding: '0 0 18px' }}><div className="card-title">{admin ? 'All clients' : 'Assigned clients'}</div><div className="card-tools"><label>Month <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></label>{admin && <button className="btn-dark" onClick={() => openForm()}>Add client</button>}</div></div>
      {loading ? <p role="status">Loading clients…</p> : error && !open ? <p role="alert">{error} <button onClick={() => void load()}>Retry</button></p> : rows.length === 0 ? <p>No clients assigned yet.</p> :
        <div style={{ overflowX: 'auto' }}><table className="data-table" style={{ width: '100%' }}><thead><tr><th>Client</th><th>Niche</th>{admin && <th>Brand Manager</th>}<th>Scope delivered</th><th>Status</th><th></th></tr></thead><tbody>{rows.map((row) => {
          const total = row.scope ? row.scope.reel_count + row.scope.post_count + row.scope.carousel_count + row.scope.story_count : 0
          const pct = total ? Math.min(100, Math.round(row.delivered / total * 100)) : 0
          return <tr key={row.id}><td><strong>{row.name}</strong><div className="client-sub">{row.handle} · {row.code}</div></td><td>{row.niche}</td>{admin && <td>{managers.find((m) => m.id === row.manager_id)?.full_name ?? 'Unassigned'}</td>}<td><div className="scope"><span className="scope-pct">{pct}%</span><ProgressBar value={pct} /><span className="scope-n">{row.delivered}/{total}</span></div></td><td><Tag variant={row.status === 'active' ? 'mint' : 'grey'}>{row.status}</Tag></td><td><button className="tool" onClick={() => openForm(row)}>Edit</button></td></tr>
        })}</tbody></table></div>}
    </section>
    <Modal open={open} onClose={() => setOpen(false)} titleId="client-form-title" title={editing ? `Edit ${editing.name}` : 'Add client'} closeLabel="Close client form" footer={<><button className="btn-soft" onClick={() => setOpen(false)}>Cancel</button><button className="btn-dark" form="client-form" disabled={saving}>{saving ? 'Saving…' : 'Save client'}</button></>}>
      <form id="client-form" onSubmit={(e) => void save(e)}>
        {(['code','name','handle','niche'] as const).map((field) => <div className="field" key={field}><label htmlFor={`client-${field}`}>{field === 'code' ? 'Code' : field[0].toUpperCase() + field.slice(1)}</label><input id={`client-${field}`} value={form[field]} required disabled={field === 'code' && !!editing} onChange={(e) => setForm({ ...form, [field]: e.target.value })} /></div>)}
        <div className="field"><label htmlFor="client-manager">Brand Manager</label><select id="client-manager" value={form.manager_id} onChange={(e) => setForm({ ...form, manager_id: e.target.value })}>{managers.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}</select></div>
        <div className="field"><label htmlFor="client-status">Status</label><select id="client-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ClientStatus })}>{['onboarding','active','paused','churned'].map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
        {!editing && <><strong>Monthly scope of work</strong>{(['reel_count','post_count','carousel_count','story_count'] as const).map((field) => <div className="field" key={field}><label htmlFor={`client-${field}`}>{field.replace('_count','s')}</label><input id={`client-${field}`} type="number" min="0" value={form[field]} onChange={(e) => setForm({ ...form, [field]: Number(e.target.value) })} /></div>)}</>}
        {error && <p role="alert">{error}</p>}
      </form>
    </Modal>
  </>
}
