'use client'

import { useCallback, useEffect, useState } from 'react'
import { Tag } from '@/components/shared'
import { confirmationPhrase, formatBytes, MAX_DELETE_PER_REQUEST } from '@/lib/storage/constants'
import type { StorageOverview } from '@/lib/storage/usage'

type Data = StorageOverview & { canDelete: boolean }

export function StorageView() {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')
  const [verify, setVerify] = useState<string>('')

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/storage', { cache: 'no-store' })
      if (!response.ok) throw new Error()
      setData(await response.json()); setError('')
    } catch { setError('Could not load storage usage.') }
  }, [])
  useEffect(() => { queueMicrotask(() => void load()) }, [load])

  const selected = data?.eligible.filter((entry) => picked.includes(entry.shoot_id)) ?? []
  const freeing = selected.reduce((total, entry) => total + entry.bytes, 0)
  const phrase = confirmationPhrase(selected.length)

  async function remove() {
    setBusy('delete'); setNotice(''); setError('')
    try {
      const response = await fetch('/api/storage/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shootIds: picked, confirm }) })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok && !payload.results) throw new Error(payload.message ?? 'Could not delete')
      const failed = (payload.results as { ok: boolean; message?: string }[]).filter((result) => !result.ok)
      setNotice(`Freed ${formatBytes(payload.freed ?? 0)}.${failed.length ? ` ${failed.length} could not be deleted: ${failed[0].message}` : ''}`)
      setPicked([]); setConfirm(''); await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not delete') }
    finally { setBusy('') }
  }
  async function checkDrive() {
    setBusy('verify'); setVerify('')
    const response = await fetch('/api/storage/verify', { method: 'POST' }).catch(() => null)
    const payload = await response?.json().catch(() => ({}))
    setVerify(response?.ok ? `Drive reports ${formatBytes(payload.reported)}; the app has recorded ${formatBytes(payload.recorded)} (difference ${payload.percentDifference}%).` : payload?.message ?? 'Could not reach Drive.')
    setBusy('')
  }

  if (!data) return <section className="card" style={{ padding: 22 }}>{error ? <p role="alert" className="rv-error">{error} <button type="button" className="cm-link" onClick={() => void load()}>Retry</button></p> : <p role="status">Loading storage…</p>}</section>
  return <section aria-label="Storage" style={{ display: 'grid', gap: 14 }}>
    {data.level !== 'ok' && <div className="cm-block cm-issued" role="alert"><h3>{data.level === 'warn85' ? 'Drive is over 85% full' : 'Drive is over 70% full'}</h3>
      <p>Raw footage uses {formatBytes(data.used)} of the {formatBytes(data.pool)} pool. Delete finished shoots below to make room.</p></div>}
    <div className="card" style={{ padding: 22 }}>
      <h2 className="card-title">Google Drive: raw footage</h2>
      <p style={{ margin: '6px 0', fontWeight: 700 }}>{formatBytes(data.used)} of {formatBytes(data.pool)} used ({data.percent}%)</p>
      <div className="sow-bar" role="img" aria-label={`${data.percent}% of the Drive pool used`}><span style={{ width: `${Math.min(100, data.percent)}%` }} /></div>
      {data.canDelete && <p style={{ marginTop: 10 }}><button type="button" className="btn-soft" disabled={!!busy} onClick={() => void checkDrive()}>{busy === 'verify' ? 'Checking Drive…' : 'Compare with Drive'}</button> {verify && <span className="cm-meta" role="status">{verify}</span>}</p>}
      {!data.byClient.length ? <p className="cm-meta" style={{ marginTop: 12 }}>No raw footage is stored yet.</p> : data.byClient.map((client) => <details key={client.client_id} style={{ marginTop: 12 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 700 }}>{client.name} · {formatBytes(client.bytes)}</summary>
        <div style={{ overflowX: 'auto' }}><table className="data-table" style={{ width: '100%', marginTop: 8 }}><thead><tr><th>Shoot</th><th>Date</th><th>Files</th><th>Size</th><th>Deletion</th></tr></thead>
          <tbody>{client.shoots.map((shoot) => <tr key={shoot.id}><td>{shoot.title}</td><td>{shoot.date}</td><td>{shoot.files}</td><td>{formatBytes(shoot.bytes)}</td>
            <td>{shoot.eligible ? <Tag variant="mint">Eligible</Tag> : <span className="cm-meta">{shoot.reason}</span>}</td></tr>)}</tbody></table></div></details>)}
      {data.otherBytes > 0 && <p className="cm-meta" style={{ marginTop: 10 }}>Other clients (not yours): {formatBytes(data.otherBytes)}</p>}
    </div>

    <div className="card" style={{ padding: 22 }}>
      <h2 className="card-title">Backblaze B2: cuts and library</h2>
      <p style={{ margin: '6px 0' }}>{formatBytes(data.b2.total)} in total · cuts {formatBytes(data.b2.cuts)} · library {formatBytes(data.b2.library)}. No size limit applies here.</p>
    </div>

    <div className="card" style={{ padding: 22 }}>
      <h2 className="card-title">Raw footage eligible for deletion · {data.eligible.length}</h2>
      <p className="cm-meta">Shoots whose ideas were all posted more than 30 days ago. {formatBytes(data.freeable)} could be freed.</p>
      {!data.eligible.length ? <p className="cm-meta" style={{ marginTop: 10 }}>Nothing is eligible yet.</p> : data.eligible.map((entry) => <label key={entry.shoot_id} className="pref-row" style={{ padding: '6px 0' }}>
        <input type="checkbox" disabled={!data.canDelete || (!picked.includes(entry.shoot_id) && picked.length >= MAX_DELETE_PER_REQUEST)} checked={picked.includes(entry.shoot_id)}
          onChange={(event) => setPicked((current) => event.target.checked ? [...current, entry.shoot_id] : current.filter((id) => id !== entry.shoot_id))} />
        <span><b>{entry.client}</b> · {entry.title} · {formatBytes(entry.bytes)}</span></label>)}
      {!data.canDelete && <p className="cm-meta" style={{ marginTop: 10 }}>Only an admin can delete raw footage.</p>}
      {data.canDelete && selected.length > 0 && <div className="cm-block cm-issued" style={{ marginTop: 12 }}>
        <h3>This permanently removes raw footage</h3>
        <p>You are about to delete the Drive folders for {selected.length === 1 ? 'this shoot' : `these ${selected.length} shoots`} and every raw file in {selected.length === 1 ? 'it' : 'them'}, freeing {formatBytes(freeing)}. This cannot be undone, and the footage cannot be re-downloaded afterwards. The edited cuts in B2 are not touched.</p>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>{selected.map((entry) => <li key={entry.shoot_id}>{entry.client} · {entry.title} · {formatBytes(entry.bytes)}</li>)}</ul>
        <label className="cm-label" htmlFor="storage-confirm">Type <b>{phrase}</b> to confirm</label>
        <input id="storage-confirm" value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="off" />
        <div className="cm-actions"><button type="button" className="btn-pink" disabled={busy === 'delete' || confirm.trim().toLowerCase() !== phrase} onClick={() => void remove()}>{busy === 'delete' ? 'Deleting…' : `Delete ${selected.length} ${selected.length === 1 ? 'shoot' : 'shoots'}`}</button></div></div>}
      {picked.length >= MAX_DELETE_PER_REQUEST && <p className="cm-meta">You can delete at most {MAX_DELETE_PER_REQUEST} shoots at a time.</p>}
    </div>

    <div className="card" style={{ padding: 22 }}>
      <h2 className="card-title">Uploads that never finished · {data.staleSessions.length}</h2>
      {!data.staleSessions.length ? <p className="cm-meta">No unfinished uploads.</p> : <div style={{ overflowX: 'auto' }}><table className="data-table" style={{ width: '100%' }}>
        <thead><tr><th>File</th><th>Client · shoot</th><th>Status</th><th>Progress</th><th>Idle</th></tr></thead>
        <tbody>{data.staleSessions.map((session) => <tr key={session.id}><td>{session.file}</td><td>{session.client} · {session.shoot}</td><td>{session.status}</td><td>{session.percent}%</td><td>{session.ageHours} h</td></tr>)}</tbody></table></div>}
    </div>
    {notice && <p role="status" className="cm-meta">{notice}</p>}
    {error && <p role="alert" className="rv-error">{error}</p>}
  </section>
}
