'use client'
import { useState } from 'react'
import { TopNav, DataTable, Tag, Pager, EmptyState } from '@/components/shared'
import { contentItems, clients, users, monthlyPlans } from '@/lib/fixtures'

export default function AdminPlannerPage() {
  const planned = contentItems.filter((ci) => ci.planned_date)
  const [page, setPage] = useState(1)
  const pageSize = 8
  const paged = planned.slice((page - 1) * pageSize, page * pageSize)
  const totalPages = Math.max(1, Math.ceil(planned.length / pageSize))

  return (
    <>
      <TopNav
        title="Content planner"
        tabs={[
          { label: 'Clients', href: '/admin/clients' },
          { label: 'Calendar', href: '/admin/calendar' },
          { label: 'Editors\' den', href: '/admin/den' },
          { label: 'Posting schedule', href: '/admin/posting' },
          { label: 'Content planner', href: '#' },
          { label: 'Team', href: '/admin/team' },
          { label: 'Settings', href: '/admin/settings' },
        ]}
        showSearch
        searchPlaceholder="Search ideas…"
        rightSlot={<button className="btn-dark">+ Plan content</button>}
      />

      <div className="grid">
        <div className="card">
          <div className="card-head">
            <span className="card-title">{planned.length} ideas in planner</span>
          </div>
          {paged.length === 0 ? (
            <EmptyState title="No ideas planned yet" subtitle="Click Plan content to get started." />
          ) : (
            <>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>IDEA</th>
                      <th>CLIENT</th>
                      <th>TYPE</th>
                      <th>STATUS</th>
                      <th>PLANNED</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((ci) => {
                      const client = clients.find((c) => c.id === ci.client_id)
                      return (
                        <tr key={ci.id}>
                          <td style={{ fontSize: '13.5px', fontWeight: 700 }}>{ci.title}</td>
                          <td style={{ fontSize: '12.5px', color: 'var(--ink-soft)' }}>
                            {client?.name || '—'}
                          </td>
                          <td>
                            <Tag variant="sky">{ci.type}</Tag>
                          </td>
                          <td>
                            <Tag
                              variant={
                                ci.status === 'posted'
                                  ? 'mint'
                                  : ci.status === 'scheduled'
                                    ? 'sky'
                                    : 'lav'
                              }
                            >
                              {ci.status.replace(/_/g, ' ')}
                            </Tag>
                          </td>
                          <td
                            style={{
                              fontSize: '12.5px',
                              whiteSpace: 'nowrap',
                              color: 'var(--ink-soft)',
                            }}
                          >
                            {ci.planned_date ? new Date(ci.planned_date).toLocaleDateString('en-IN') : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <Pager
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                totalItems={planned.length}
                pageSize={pageSize}
              />
            </>
          )}
        </div>
        <div className="side">
          <div className="card" style={{ padding: '22px' }}>
            <div className="card-title" style={{ marginBottom: 16 }}>Monthly plans</div>
            {monthlyPlans
              .filter((mp) => mp.status !== 'approved')
              .map((mp) => {
                const client = clients.find((c) => c.id === mp.client_id)
                return (
                  <div key={mp.id} className="queue-item" style={{ padding: '12px 0' }}>
                    <div
                      className="queue-icon q--amber"
                      style={{
                        background: 'var(--amber)',
                        color: 'var(--amber-ink)',
                        width: 36,
                        height: 36,
                        borderRadius: 12,
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ width: 15, height: 15 }}
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <div className="queue-body">
                      <div className="queue-title">{client?.name || '—'}</div>
                      <div className="queue-meta">
                        {new Date(mp.month).toLocaleString('default', {
                          month: 'long',
                          year: 'numeric',
                        })}{' '}
                        · {mp.status}
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </div>
    </>
  )
}
