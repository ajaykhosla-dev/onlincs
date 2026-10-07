'use client'
import { useCallback, useEffect, useState } from 'react'
import { ProgressBar, Tag } from '@/components/shared'
import { ClientFormModal, type ClientManager, type ClientRow } from './ClientFormModal'

type Row = ClientRow
const initialMonth = '2026-09' // seeded planning month; the picker can select any month

export function LiveClients({ admin }: { admin: boolean }) {
  const [month, setMonth] = useState(initialMonth)
  const [rows, setRows] = useState<Row[]>([])
  const [managers, setManagers] = useState<ClientManager[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Row | null>(null)
  const [open, setOpen] = useState(false)
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
  useEffect(() => { const url = new URL(window.location.href); url.searchParams.set('month', month); window.history.replaceState(null, '', url) }, [month])
  // A client added from the top bar's Add client button shows up in the current month's list.
  const showAdded = useCallback(() => {
    const savedMonth = new Date().toISOString().slice(0, 7)
    if (savedMonth === month) void load()
    else setMonth(savedMonth)
  }, [month, load])
  useEffect(() => {
    window.addEventListener('client-added', showAdded)
    return () => window.removeEventListener('client-added', showAdded)
  }, [showAdded])
  function openForm(row?: Row) { setEditing(row ?? null); setOpen(true) }
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
    <ClientFormModal open={open} onClose={() => setOpen(false)} editing={editing} managers={managers} onSaved={() => { if (editing) void load(); else showAdded() }} />
  </>
}
