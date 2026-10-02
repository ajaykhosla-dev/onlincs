'use client'
import { useState } from 'react'
import { TopNav, Tag, EmptyState } from '@/components/shared'
import { deliverableVersions, contentItems, clients, comments, getContentItemsForEditor } from '@/lib/fixtures'

export default function EditorRedoPage() {
  const myItemIds = getContentItemsForEditor('u-5').map(ci => ci.id)
  const myChanges = deliverableVersions.filter(dv => myItemIds.includes(dv.content_item_id) && dv.status === 'changes_requested')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = myChanges.find(d => d.id === selectedId)
  const selComments = selected ? comments.filter(c => c.version_id === selected.id) : []

  if (selected) {
    const ci = contentItems.find(c => c.id === selected.content_item_id)
    const client = ci ? clients.find(c => c.id === ci.client_id) : null
    return (
      <>
        <TopNav title="Re-do" tabs={[{ label: 'To-do', href: '/editor/todo' }, { label: 'Re-do', href: '#' }, { label: 'Library', href: '/editor/library' }]} showSearch searchPlaceholder="Search…" />
        <button className="back-link" onClick={() => setSelectedId(null)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          Back to list
        </button>
        <div className="review-layout">
          <div>
            <div className="video-ph">
              <div className="play-glyph"><svg viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>
            </div>
            <div style={{ marginTop: 18 }}>
              <button className="btn-dark" style={{ width: '100%', justifyContent: 'center', marginBottom: 12 }}>Upload revised cut</button>
              <div className="upload-area">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <p>Drop your revised cut here</p>
                <p className="upload-spec">H.264 MP4 · under 200 MB · faststart</p>
              </div>
            </div>
          </div>
          <div>
            <div className="instr-compare">
              <div className="instr-col old">
                <h4>Previous cut</h4>
                <p>{ci?.instructions_editor || 'No instructions'}</p>
              </div>
              <div className="instr-col new">
                <h4>New instructions</h4>
                <p>{ci?.instructions_editor || 'Same as original'}</p>
              </div>
            </div>
            <div className="card" style={{ marginTop: 18, padding: '18px 22px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Change requests</div>
              {selComments.map(c => (
                <div key={c.id} className="comment">
                  <div className="comment-head">
                    <span className="comment-ts">{c.timestamp_start !== null ? `${c.timestamp_start}s–${c.timestamp_end}s` : 'General'}</span>
                    <span className="comment-author">{c.author_label}</span>
                  </div>
                  {c.body && <p className="comment-text">{c.body}</p>}
                  {c.transcript && <p className="transcript">"{c.transcript}"</p>}
                </div>
              ))}
              {selComments.length === 0 && <p style={{ fontSize: 13, color: 'var(--muted)' }}>No change requests.</p>}
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <TopNav title="Re-do" tabs={[{ label: 'To-do', href: '/editor/todo' }, { label: 'Re-do', href: '#' }, { label: 'Library', href: '/editor/library' }]} showSearch searchPlaceholder="Search…" />
      {myChanges.length === 0 ? (
        <EmptyState title="No re-do requests" subtitle="Changes will appear here when requested." />
      ) : (
        <div className="card">
          <div className="card-head"><span className="card-title">Change requests</span></div>
          {myChanges.map(dv => {
            const ci = contentItems.find(c => c.id === dv.content_item_id)
            const verComments = comments.filter(c => c.version_id === dv.id)
            return (
              <div key={dv.id} className="queue-item" style={{ cursor: 'pointer' }} onClick={() => setSelectedId(dv.id)}>
                <div className="queue-icon q--amber" style={{ background: 'var(--amber)', color: 'var(--amber-ink)', width: 38, height: 38, borderRadius: 13, display: 'grid', placeItems: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                </div>
                <div className="queue-body">
                  <div className="queue-title">{ci?.title || '—'} (v{dv.version})</div>
                  <div className="queue-meta">{verComments.length} change requests</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
