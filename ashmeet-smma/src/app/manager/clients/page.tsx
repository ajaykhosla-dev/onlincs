'use client'
import { useState } from 'react'
import { TopNav, MetricCard, FilterStrip, DataTable, Pager, Tag, EmptyState, ProgressBar } from '@/components/shared'
import { getClientsForManager, contentItems, users, getContentItemsForClient } from '@/lib/fixtures'

export default function ManagerClientsPage() {
  const managerClients = getClientsForManager('u-2') // Jaspreet Kaur's clients only
  const [filterStatus, setFilterStatus] = useState('all')
  let filtered = managerClients
  if (filterStatus !== 'all') filtered = filtered.filter(c => c.status === filterStatus)

  const metrics = [
    { label: 'My clients', value: String(managerClients.length), theme: 'violet' as const },
    { label: 'Items this month', value: String(filtered.reduce((s, c) => s + getContentItemsForClient(c.id).length, 0)), theme: 'amber' as const },
    { label: 'Awaiting approval', value: String(filtered.reduce((s, c) => s + getContentItemsForClient(c.id).filter(ci => ci.status === 'with_client').length, 0)), theme: 'pink' as const },
  ]

  return (
    <>
      <TopNav
        title="Clients"
        tabs={[
          { label: 'Clients', href: '#' },
          { label: 'Calendar', href: '/manager/calendar' },
          { label: 'Editors\' den', href: '/manager/den' },
          { label: 'Posting', href: '/manager/posting' },
          { label: 'Planner', href: '/manager/planner' },
        ]}
        showSearch
        searchPlaceholder="Search clients…"
        rightSlot={<button className="btn-dark">+ Schedule a shoot</button>}
      />

      <div className="scope-banner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Your clients — {managerClients.map(c => c.name).join(' and ')} only
      </div>

      <div className="hero-row">
        {metrics.map(m => <MetricCard key={m.label} label={m.label} value={m.value} theme={m.theme} />)}
      </div>

      <FilterStrip
        label="My clients"
        filters={[
          { key: 'status', label: 'Status', value: filterStatus, options: [{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'onboarding', label: 'Onboarding' }, { value: 'paused', label: 'Paused' }] },
        ]}
        onFilterChange={(_, v) => setFilterStatus(v)}
      />

      <div className="card">
        <div className="table-scroll">
          <table>
            <thead><tr><th>CLIENT</th><th>MONTHLY SCOPE</th><th>ITEMS IN PIPELINE</th><th>STATUS</th></tr></thead>
            <tbody>
              {filtered.map(c => {
                const items = getContentItemsForClient(c.id)
                const posted = items.filter(i => i.status === 'posted').length
                return (
                  <tr key={c.id}>
                    <td>
                      <div className="client">
                        <div className="mono" style={{ background: 'linear-gradient(140deg,#8F80F7,#5A4AD8)' }}>{c.code.slice(0,2)}</div>
                        <div>
                          <div className="client-name">{c.name}</div>
                          <div className="client-sub">{c.handle} · {c.niche}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="scope">
                        <ProgressBar value={posted} max={8} label={`${posted}/8`} variant={posted >= 7 ? 'done' : posted >= 4 ? 'default' : 'warn'} />
                      </div>
                    </td>
                    <td style={{ fontSize: '12.5px', fontWeight: 600 }}>{items.length} items</td>
                    <td><Tag variant={c.status === 'active' ? 'mint' : c.status === 'onboarding' ? 'lav' : 'amber'}>{c.status}</Tag></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <Pager currentPage={1} totalPages={1} onPageChange={() => {}} />
      </div>
    </>
  )
}
