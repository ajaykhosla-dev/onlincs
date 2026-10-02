'use client'
import { useState } from 'react'
import { TopNav, Tag, EmptyState } from '@/components/shared'
import { contentItems, clients, getContentItemsForEditor } from '@/lib/fixtures'

export default function EditorTodoPage() {
  const myItems = getContentItemsForEditor('u-5') // Rohit Bansal
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = myItems.find(ci => ci.id === selectedId)

  if (selected) {
    const client = clients.find(c => c.id === selected.client_id)
    return (
      <>
        <TopNav title="To-do" tabs={[{ label: 'To-do', href: '#' }, { label: 'Re-do', href: '/editor/redo' }, { label: 'Library', href: '/editor/library' }]} showSearch searchPlaceholder="Search…" />
        <button className="back-link" onClick={() => setSelectedId(null)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          Back to list
        </button>

        <div className="card" style={{ marginBottom: 22, padding: '24px' }}>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>{selected.title}</div>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 20 }}>{client?.name} · {selected.type}</div>

          <div className="brief-row"><b>Concept</b><span>{selected.concept}</span></div>
          <div className="brief-row"><b>Script</b><span>{selected.script}</span></div>
          <div className="brief-row"><b>Instructions</b><span>{selected.instructions_editor || 'None'}</span></div>
          <div className="brief-row"><b>Reference</b>{selected.reference_links.length > 0 ? selected.reference_links.map(link => <a key={link} href={link} className="ref-link" target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Reference link
          </a>) : <span style={{ color: 'var(--muted)' }}>None</span>}</div>
        </div>

        <button className="btn-dark" style={{ width: '100%', marginBottom: 18, justifyContent: 'center' }}>Open raw footage</button>

        <div className="upload-area">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <p>Drop your cut here or click to upload</p>
          <p className="upload-spec">H.264 MP4 · under 200 MB · faststart</p>
        </div>
      </>
    )
  }

  return (
    <>
      <TopNav title="To-do" tabs={[{ label: 'To-do', href: '#' }, { label: 'Re-do', href: '/admin/editor/redo' }, { label: 'Library', href: '/admin/editor/library' }]} showSearch searchPlaceholder="Search…" rightSlot={<button className="btn-soft">Toggle theme</button>} />
      {myItems.length === 0 ? (
        <EmptyState title="No tasks yet" subtitle="Cuts will appear here when assigned." />
      ) : myItems.map(ci => {
        const today = new Date().toISOString().split('T')[0]
        let variant: 'today' | 'soon' | 'ok' = 'ok'
        if (ci.deadline === today) variant = 'today'
        else if (ci.deadline && new Date(ci.deadline) <= new Date(new Date().setDate(new Date().getDate() + 3))) variant = 'soon'
        return (
          <button key={ci.id} className="task-card" onClick={() => setSelectedId(ci.id)}>
            <div className="task-main">
              <div className="task-idea">{ci.title}</div>
              <div className="task-meta">{clients.find(c => c.id === ci.client_id)?.name} · {ci.type} · Deadline: {ci.deadline ? new Date(ci.deadline).toLocaleDateString('en-IN') : '—'}</div>
            </div>
            <span className={`task-urgency u--${variant}`}>{variant === 'today' ? 'Today' : variant === 'soon' ? 'Soon' : 'OK'}</span>
          </button>
        )
      })}
    </>
  )
}
