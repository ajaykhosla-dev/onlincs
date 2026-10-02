'use client'
import Link from 'next/link'
import { useState } from 'react'
import { TopNav, MetricCard, FilterStrip, DataTable, Pager, Tag, EmptyState, ProgressBar } from '@/components/shared'
import { clients as allClients, users, contentItems, getContentItemsForClient, getClientsForManager } from '@/lib/fixtures'

export default function AdminClientsPage() {
  const [search, setSearch] = useState('')
  const [filterManager, setFilterManager] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  let filtered = allClients
  if (search) filtered = filtered.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
  if (filterStatus !== 'all') filtered = filtered.filter((c) => c.status === filterStatus)
  if (filterManager !== 'all') filtered = filtered.filter((c) => c.manager_id === filterManager)

  const activeClients = allClients.filter(c => c.status !== 'onboarding')
  const pendingApproval = allClients.filter(c => contentItems.some(ci => ci.client_id === c.id && ci.status === 'with_client')).length
  const pastDeadline = contentItems.filter(ci => ci.deadline && new Date(ci.deadline) < new Date() && !['posted', 'scheduled'].includes(ci.status)).length

  const metrics = [
    { label: 'Active allClients', value: String(allClients.length), theme: 'violet' as const },
    { label: 'Pending approvals', value: String(pendingApproval), theme: 'pink' as const },
    { label: 'Past deadline', value: String(pastDeadline), theme: 'amber' as const },
  ]

  const managers = Array.from(new Set(allClients.map((c) => c.manager_id)))

  return (
    <>
      <TopNav
        title="Clients"
        tabs={[
          { label: 'Clients', href: '#' },
          { label: 'Calendar', href: '/admin/calendar' },
          { label: 'Editors\' den', href: '/admin/den' },
          { label: 'Posting schedule', href: '/admin/posting' },
          { label: 'Content planner', href: '/admin/planner' },
          { label: 'Team', href: '/admin/team' },
          { label: 'Settings', href: '/admin/settings' },
        ]}
        showSearch
        searchPlaceholder="Search allClients…"
        rightSlot={
          <>
            <button className="btn-soft">Export data</button>
            <button className="btn-dark">+ Add client</button>
          </>
        }
      />

      <div className="hero-row">
        <div className="hello" style={{ padding: '4px 10px 4px 0' }}>
          <h1><span className="light">Hi Ashmeet!</span>Who needs you today?</h1>
          <p>Clients, approvals, and deadlines — all in one place.</p>
        </div>
        {metrics.map((m) => (
          <MetricCard key={m.label} label={m.label} value={m.value} theme={m.theme} />
        ))}
      </div>

      <FilterStrip
        label="All allClients"
        filters={[
          {
            key: 'manager',
            label: 'Manager',
            value: filterManager,
            options: [
              { value: 'all', label: 'All managers' },
              ...managers.map((id) => {
                const u = users.find((x) => x.id === id)
                return { value: id, label: u?.full_name || id }
              }),
            ],
          },
          {
            key: 'status',
            label: 'Status',
            value: filterStatus,
            options: [
              { value: 'all', label: 'All statuses' },
              { value: 'active', label: 'Active' },
              { value: 'onboarding', label: 'Onboarding' },
              { value: 'paused', label: 'Paused' },
            ],
          },
        ]}
        onFilterChange={(k, v) => (k === 'manager' ? setFilterManager(v) : setFilterStatus(v))}
        actionSlot={<button className="btn-dark">+ Add client</button>}
      />

      <div className="grid">
        <div className="card">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>CLIENT</th>
                  <th>MONTHLY SCOPE</th>
                  <th>NEXT SHOOT</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const clientItems = getContentItemsForClient(c.id)
                  const posted = clientItems.filter(i => i.status === 'posted').length
                  const sow = 20 // SoW is 20 for all allClients per context.md (default)
                  const nextShoot = [...contentItems]
                    .filter(ci => ci.client_id === c.id && ci.planned_date && new Date(ci.planned_date) >= new Date())
                    .sort((a, b) => new Date(a.planned_date!).getTime() - new Date(b.planned_date!).getTime())[0]

                  return (
                    <tr key={c.id}>
                      <td>
                        <div className="client">
                          <div className="mono" style={{
                            background: c.code === 'RAM-01' ? 'linear-gradient(140deg,#8F80F7,#5A4AD8)' :
                              c.code === 'GRV-02' ? 'linear-gradient(140deg,#F8A0BC,#DF5A86)' :
                              c.code === 'SDH-03' ? 'linear-gradient(140deg,#63DCA9,#1FA772)' :
                              c.code === 'KHN-04' ? 'linear-gradient(140deg,#FFC974,#DF8A0E)' :
                              c.code === 'BSL-05' ? 'linear-gradient(140deg,#62A0F2,#14539F)' :
                              'linear-gradient(140deg,#8F80F7,#5A4AD8)'
                          }}>{c.code.slice(0, 2)}</div>
                          <div>
                            <div className="client-name">{c.name}</div>
                            <div className="client-sub">{c.handle} · {c.niche}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="scope">
                          <span className="scope-pct">{posted}/{sow}</span>
                          <div className="track">
                            <i className={posted >= sow * 0.8 ? '' : posted >= sow * 0.5 ? '' : 'warn'} style={{ width: `${Math.round(posted / sow * 100)}%` }} />
                          </div>
                          <span className="scope-n">delivered</span>
                        </div>
                      </td>
                      <td style={{ fontSize: '12.5px', color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>
                        {nextShoot && nextShoot.planned_date ? new Date(nextShoot.planned_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Not scheduled'}
                      </td>
                      <td><Tag variant={c.status === 'active' ? 'mint' : c.status === 'onboarding' ? 'lav' : 'amber'}>{c.status}</Tag></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pager currentPage={1} totalPages={1} onPageChange={() => {}} />
        </div>
        <div className="side">
          <div className="card" style={{ padding: '22px' }}>
            <div className="card-title" style={{ marginBottom: 16 }}>Waiting on you</div>
            <div className="queue">
              {contentItems
                .filter(ci => ci.status === 'with_client' || ci.status === 'changes_requested')
                .slice(0, 5)
                .map((ci) => {
                  const client = allClients.find(c => c.id === ci.client_id)
                  return (
                    <div key={ci.id} className="queue-item" style={{ padding: '13px 0' }}>
                      <div className={`queue-icon ${ci.status === 'with_client' ? 'q--pink' : 'q--amber'}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          {ci.status === 'with_client'
                            ? <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>
                            : <><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></>
                          }
                        </svg>
                      </div>
                      <div className="queue-body">
                        <div className="queue-title">{ci.title}</div>
                        <div className="queue-meta">{client?.name} · {ci.status.replace(/_/g, ' ')}</div>
                      </div>
                    </div>
                  )
                })}
              <button className="queue-all">View all approvals →</button>
            </div>
          </div>
          <div className="promo">
            <div className="promo-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </div>
            <h3>Scope check</h3>
            <p>4 allClients are behind on their monthly delivery. Review and adjust scope before month end.</p>
            <button>Review scope</button>
          </div>
        </div>
      </div>
    </>
  )
}
