'use client'
import { useState } from 'react'
import { TopNav, DataTable, Tag, Pager, EmptyState } from '@/components/shared'
import { contentItems, clients, getClientsForManager } from '@/lib/fixtures'

export default function ManagerPlannerPage() {
  const myClientIds = getClientsForManager('u-2').map(c => c.id)
  const myItems = contentItems.filter(ci => myClientIds.includes(ci.client_id) && ci.planned_date)
  const [page, setPage] = useState(1)
  const pageSize = 8
  const paged = myItems.slice((page - 1) * pageSize, page * pageSize)
  const totalPages = Math.max(1, Math.ceil(myItems.length / pageSize))

  return (
    <>
      <TopNav title="Content planner" tabs={[
          { label: 'Clients', href: '/manager/clients' },
          { label: 'Calendar', href: '/manager/calendar' },
          { label: 'Editors\' den', href: '/manager/den' },
          { label: 'Posting', href: '/manager/posting' },
          { label: 'Planner', href: '#' },
        ]} showSearch searchPlaceholder="Search ideas…" rightSlot={<button className="btn-dark">+ Plan content</button>} />
      <div className="scope-banner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Scoped to {myClientIds.map(id => clients.find(c => c.id === id)?.name).filter(Boolean).join(' and ')}
      </div>
      <div className="card">
        <div className="card-head"><span className="card-title">{myItems.length} ideas in planner</span></div>
        {paged.length === 0 ? (
          <EmptyState title="No ideas planned yet" subtitle="Click Plan content to get started." />
        ) : (
          <>
            <div className="table-scroll">
              <table>
                <thead><tr><th>IDEA</th><th>CLIENT</th><th>TYPE</th><th>STATUS</th><th>PLANNED</th></tr></thead>
                <tbody>
                  {paged.map(ci => {
                    const client = clients.find(c => c.id === ci.client_id)
                    return (
                      <tr key={ci.id}>
                        <td style={{ fontSize: '13.5px', fontWeight: 700 }}>{ci.title}</td>
                        <td style={{ fontSize: '12.5px', color: 'var(--ink-soft)' }}>{client?.name || '—'}</td>
                        <td><Tag variant="sky">{ci.type}</Tag></td>
                        <td><Tag variant={ci.status === 'posted' ? 'mint' : ci.status === 'scheduled' ? 'sky' : 'lav'}>{ci.status.replace(/_/g, ' ')}</Tag></td>
                        <td style={{ fontSize: '12.5px', whiteSpace: 'nowrap', color: 'var(--ink-soft)' }}>{ci.planned_date ? new Date(ci.planned_date).toLocaleDateString('en-IN') : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Pager currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={myItems.length} pageSize={pageSize} />
          </>
        )}
      </div>
    </>
  )
}
