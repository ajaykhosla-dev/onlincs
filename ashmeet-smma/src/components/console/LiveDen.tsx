'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { MediaPlayer } from '@/components/editor/MediaPlayer'
import type { MediaVersion } from '@/lib/phase5/data'

type Item = { id: string; title: string; client_name: string; status: string; deadline: string | null;
  assigned_editor_id: string | null; versions: MediaVersion[] }
type Editor = { id: string; full_name: string; load: number }

export function LiveDen({ items, editors }: { items: Item[]; editors: Editor[] }) {
  const router = useRouter()
  const [selected,setSelected] = useState<string | null>(null)
  const [editorId,setEditorId] = useState('')
  const [deadline,setDeadline] = useState('')
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const item = items.find((entry) => entry.id === selected)

  function open(entry: Item) { setSelected(entry.id); setEditorId(entry.assigned_editor_id ?? ''); setDeadline(entry.deadline ?? ''); setError('') }
  async function assign() {
    if (!item || !editorId || !deadline) { setError('Choose an editor and deadline.'); return }
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/editor-assign',{ method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ itemId:item.id,editorId,deadline }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message ?? 'Could not assign editor')
      setSelected(null); router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not assign editor') }
    finally { setBusy(false) }
  }

  return <section style={{ padding:28,overflowY:'auto' }}>
    <header className="hero-row" style={{ gridTemplateColumns:'1fr' }}><div className="hello"><h1>Editors&apos; den</h1>
      <p>Assign raw footage by current load, then review every submitted cut.</p></div></header>
    <div className="card" style={{ padding:22,marginBottom:18 }}><h2 className="card-title">Editor load</h2>
      <div style={{ display:'flex',gap:12,flexWrap:'wrap',marginTop:12 }}>{editors.map((editor) =>
        <span key={editor.id} className="btn-soft">{editor.full_name} · {editor.load} active</span>)}</div></div>
    <div className="card" style={{ padding:22 }}><h2 className="card-title">Pipeline</h2>
      {!items.length && <p>No items are waiting for an editor or cut review.</p>}
      {items.map((entry) => <button key={entry.id} type="button" className="den-row" onClick={() => open(entry)} style={{ width:'100%',textAlign:'left' }}>
        <div className="den-main"><strong>{entry.title}</strong><div className="den-meta">{entry.client_name} · {entry.status.replaceAll('_',' ')} · {entry.versions.length} cut{entry.versions.length === 1 ? '' : 's'}</div></div>
        <span className="den-deadline">{entry.deadline ?? 'No deadline'}</span></button>)}</div>
    {item && <div className="card" style={{ padding:24,marginTop:18 }}>
      <button type="button" className="btn-soft" onClick={() => setSelected(null)}>Back to list</button>
      <h2 style={{ marginTop:14 }}>{item.title} · {item.client_name}</h2>
      {['raw_uploaded','changes_requested','with_editor'].includes(item.status) && <div style={{ display:'flex',gap:10,alignItems:'end',flexWrap:'wrap' }}>
        <label>Editor<select value={editorId} onChange={(event) => setEditorId(event.target.value)} style={{ display:'block',padding:10,minWidth:200 }}>
          <option value="">Choose editor</option>{editors.map((editor) => <option key={editor.id} value={editor.id}>{editor.full_name} · {editor.load} active</option>)}
        </select></label>
        <label>Deadline<input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} style={{ display:'block',padding:10 }} /></label>
        <button className="btn-dark" type="button" disabled={busy} onClick={assign}>{item.assigned_editor_id ? 'Update assignment' : 'Assign edit'}</button>
      </div>}
      {error && <p role="alert">{error}</p>}
      <h3 style={{ marginTop:20 }}>Version history</h3>
      {!item.versions.length && <p>No cut has been submitted yet.</p>}
      {[...item.versions].reverse().map((version,index) => <div key={version.id} style={{ borderTop:'1px solid #e8e8f2',padding:'16px 0' }}>
        <strong>Version {version.version}{index === 0 ? ' · latest' : ' · read only'}</strong>
        <p>{version.status.replaceAll('_',' ')} · {(version.file_size_bytes/1048576).toFixed(1)} MB · {version.duration_seconds == null ? 'Duration pending' : `${version.duration_seconds}s`} · {new Date(version.uploaded_at).toLocaleString()}</p>
        <MediaPlayer key={version.id} versionId={version.id} title={`version ${version.version}`} />
      </div>)}
    </div>}
  </section>
}
