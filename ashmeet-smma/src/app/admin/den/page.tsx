'use client'
import { useState } from 'react'
import { TopNav, DataTable, Tag, EmptyState, Pager } from '@/components/shared'
import { deliverableVersions, contentItems, clients, comments, users, getInitials } from '@/lib/fixtures'

export default function AdminDenPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const submitted = deliverableVersions.filter((dv) =>
    ['cut_submitted', 'internally_approved'].includes(dv.status),
  )

  const selected = submitted.find((d) => d.id === selectedId)
  const denComments = selected ? comments.filter((c) => c.version_id === selected.id) : []

  if (selected) {
    const ci = contentItems.find((c) => c.id === selected.content_item_id)
    const client = ci ? clients.find((c) => c.id === ci.client_id) : null
    return (
      <>
        <TopNav
          title="Editors' den"
          tabs={[
            { label: 'Clients', href: '/admin/clients' },
            { label: 'Calendar', href: '/admin/calendar' },
            { label: 'Editors\' den', href: '#' },
            { label: 'Posting schedule', href: '/admin/posting' },
            { label: 'Content planner', href: '/admin/planner' },
            { label: 'Team', href: '/admin/team' },
            { label: 'Settings', href: '/admin/settings' },
          ]}
          showSearch
          searchPlaceholder="Search cuts…"
        />
        <button className="back-link" onClick={() => setSelectedId(null)}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back to list
        </button>

        <div className="review-layout">
          <div>
            <div className="video-ph">
              <div className="play-glyph">
                <svg viewBox="0 0 24 24" fill="white">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
            </div>
            <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn-dark">Approve</button>
              <button className="btn-soft">Request changes</button>
              <button className="btn-soft" style={{ color: 'var(--violet-deep)' }}>
                Open raw footage
              </button>
            </div>

            <div className="card" style={{ marginTop: 22, padding: '22px 26px' }}>
              <div className="card-title" style={{ fontSize: 15, marginBottom: 12 }}>
                Brief
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <b style={{ width: 140, flexShrink: 0, fontSize: '12.5px', color: 'var(--ink-soft)' }}>
                  Idea
                </b>
                <span style={{ fontSize: 13, lineHeight: 1.6 }}>{ci?.title || '—'}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <b style={{ width: 140, flexShrink: 0, fontSize: '12.5px', color: 'var(--ink-soft)' }}>
                  Client
                </b>
                <span style={{ fontSize: 13 }}>{client?.name || '—'}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <b style={{ width: 140, flexShrink: 0, fontSize: '12.5px', color: 'var(--ink-soft)' }}>
                  Instructions
                </b>
                <span style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--ink-soft)' }}>
                  {ci?.instructions_editor || 'No additional instructions.'}
                </span>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '18px 22px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--ink-soft)' }}>
              {denComments.length} comments
            </div>
            {denComments.map((c) => (
              <div key={c.id} className="comment">
                <div className="comment-head">
                  <span className="comment-ts">
                    {c.timestamp_start !== null ? `${c.timestamp_start}s–${c.timestamp_end}s` : 'General'}
                  </span>
                  <span className="comment-author">{c.author_label}</span>
                </div>
                {c.body && <p className="comment-text">{c.body}</p>}
                {c.transcript && (
                  <div className="voice-note">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="22" />
                    </svg>
                    <div className="voice-wave" />
                  </div>
                )}
                {c.transcript && <p className="transcript">"{c.transcript}"</p>}
              </div>
            ))}
            {denComments.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--muted)', padding: '14px 0' }}>
                No comments on this cut yet.
              </p>
            )}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <TopNav
        title="Editors' den"
        tabs={[
          { label: 'Clients', href: '/admin/clients' },
          { label: 'Calendar', href: '/admin/calendar' },
          { label: 'Editors\' den', href: '#' },
          { label: 'Posting schedule', href: '/admin/posting' },
          { label: 'Content planner', href: '/admin/planner' },
          { label: 'Team', href: '/admin/team' },
          { label: 'Settings', href: '/admin/settings' },
        ]}
        showSearch
        searchPlaceholder="Search cuts…"
      />
      <div className="card">
        <div className="card-head">
          <span className="card-title">Submissions awaiting review</span>
          <div className="card-tools">
            <button className="tool">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              Filter
            </button>
          </div>
        </div>
        {submitted.length === 0 ? (
          <EmptyState title="No cuts awaiting review" subtitle="All submissions have been reviewed." />
        ) : (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>IDEA</th>
                    <th>CLIENT</th>
                    <th>EDITOR</th>
                    <th>VERSION</th>
                    <th>STATUS</th>
                    <th>DEADLINE</th>
                  </tr>
                </thead>
                <tbody>
                  {submitted.map((dv) => {
                    const ci = contentItems.find((c) => c.id === dv.content_item_id)
                    const client = ci ? clients.find((c) => c.id === ci.client_id) : null
                    const editor = users.find((u) => u.id === dv.uploaded_by)
                    return (
                      <tr
                        key={dv.id}
                        onClick={() => setSelectedId(dv.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td style={{ fontSize: '13.5px', fontWeight: 700 }}>
                          {ci?.title || '—'}
                        </td>
                        <td style={{ fontSize: '12.5px', color: 'var(--ink-soft)' }}>
                          {client?.name || '—'}
                        </td>
                        <td>
                          <div className="mgr">
                            <div
                              className="face"
                              style={{ background: editor?.avatar_gradient }}
                            >
                              {editor?.initials}
                            </div>
                            {editor?.full_name}
                          </div>
                        </td>
                        <td style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--ink-soft)' }}>
                          v{dv.version}
                        </td>
                        <td>
                          <Tag variant={dv.status === 'internally_approved' ? 'mint' : 'lav'}>
                            {dv.status.replace(/_/g, ' ')}
                          </Tag>
                        </td>
                        <td
                          style={{
                            fontSize: '12.5px',
                            color: 'var(--muted)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {ci?.deadline ? new Date(ci.deadline).toLocaleDateString('en-IN') : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Pager currentPage={1} totalPages={1} onPageChange={() => {}} />
          </>
        )}
      </div>
    </>
  )
}
