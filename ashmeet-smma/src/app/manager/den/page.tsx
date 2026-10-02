'use client'
import { useState } from 'react'
import { TopNav, DataTable, Tag, EmptyState } from '@/components/shared'
import { deliverableVersions, contentItems, clients, comments, getClientsForManager } from '@/lib/fixtures'

export default function ManagerDenPage() {
  const myClientIds = getClientsForManager('u-2').map(c => c.id)
  const submitted = deliverableVersions.filter(dv => ['cut_submitted', 'changes_requested'].includes(dv.status) && myClientIds.includes(contentItems.find(ci => ci.id === dv.content_item_id)?.client_id || ''))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = submitted.find(d => d.id === selectedId)

  if (selected) {
    const ci = contentItems.find(c => c.id === selected.content_item_id)
    const client = ci ? clients.find(c => c.id === ci.client_id) : null
    const dvComments = comments.filter(c => c.version_id === selected.id)
    return (
      <>
        <TopNav title="Editors' den" tabs={[
          { label: 'Clients', href: '/manager/clients' },
          { label: 'Calendar', href: '/manager/calendar' },
          { label: 'Editors\' den', href: '#' },
          { label: 'Posting schedule', href: '/manager/posting' },
          { label: 'Content planner', href: '/manager/planner' },
        ]} showSearch searchPlaceholder="Search…" />
        <button className="back-link" onClick={() => setSelectedId(null)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          Back to list
        </button>
        <div className="review-layout">
          <div>
            <div className="video-ph">
              <div className="play-glyph"><svg viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>
            </div>
            <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
              <button className="btn-dark">Approve</button>
              <button className="btn-soft">Request changes</button>
            </div>
          </div>
          <div className="card" style={{ padding: '18px 22px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--ink-soft)' }}>{dvComments.length} comments</div>
            {dvComments.map(c => (
              <div key={c.id} className="comment">
                <div className="comment-head">
                  <span className="comment-ts">{c.timestamp_start !== null ? `${c.timestamp_start}s–${c.timestamp_end}s` : 'General'}</span>
                  <span className="comment-author">{c.author_label}</span>
                </div>
                {c.body && <p className="comment-text">{c.body}</p>}
                {c.transcript && (
                  <div className="voice-note">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                    <div className="voice-wave" />
                  </div>
                )}
                {c.transcript && <p className="transcript">"{c.transcript}"</p>}
              </div>
            ))}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <TopNav title="Editors' den" tabs={[
        { label: 'Clients', href: '/manager/clients' },
        { label: 'Calendar', href: '/manager/calendar' },
        { label: 'Editors\' den', href: '#' },
        { label: 'Posting', href: '/manager/posting' },
        { label: 'Planner', href: '/manager/planner' },
      ]} showSearch searchPlaceholder="Search cuts…" />
      <div className="scope-banner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Scoped to {myClientIds.map(id => clients.find(c => c.id === id)?.name).filter(Boolean).join(' and ')}
      </div>
      <div className="card">
        <div className="card-head">
          <span className="card-title">Submissions from editors</span>
        </div>
        {submitted.length === 0 ? (
          <EmptyState title="No cuts awaiting review" subtitle="Nothing to review right now." />
        ) : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>IDEA</th><th>CLIENT</th><th>STATUS</th><th>VERSION</th></tr></thead>
              <tbody>
                {submitted.map(dv => {
                  const ci = contentItems.find(c => c.id === dv.content_item_id)
                  const client = ci ? clients.find(c => c.id === ci.client_id) : null
                  return (
                    <tr key={dv.id} onClick={() => setSelectedId(dv.id)} style={{ cursor: 'pointer' }}>
                      <td style={{ fontSize: '13.5px', fontWeight: 700 }}>{ci?.title || '—'}</td>
                      <td style={{ fontSize: '12.5px', color: 'var(--ink-soft)' }}>{client?.name || '—'}</td>
                      <td><Tag variant={dv.status === 'internally_approved' ? 'mint' : 'lav'}>{dv.status.replace(/_/g, ' ')}</Tag></td>
                      <td style={{ fontSize: '12.5px' }}>v{dv.version}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
