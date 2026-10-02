'use client'
import { useState } from 'react'
import { TopNav, Tag, EmptyState } from '@/components/shared'
import { postSchedule, contentItems, clients, getClientsForManager } from '@/lib/fixtures'

export default function ManagerPostingPage() {
  const myClientIds = getClientsForManager('u-2').map(c => c.id)
  const myScheduled = postSchedule.filter(p => {
    const ci = contentItems.find(c => c.id === p.content_item_id)
    return ci && myClientIds.includes(ci.client_id) && !p.posted_at
  })
  const [selDate, setSelDate] = useState<number | null>(new Date().getDate())
  const [selMonth] = useState(new Date().getMonth())
  const dayItems = myScheduled.filter(p => new Date(p.scheduled_at).getDate() === selDate && new Date(p.scheduled_at).getMonth() === selMonth)

  const calendarRows: (number | null)[][] = []
  const firstDay = new Date(new Date().getFullYear(), selMonth, 1).getDay()
  const daysInMonth = new Date(new Date().getFullYear(), selMonth + 1, 0).getDate()
  let row: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) row.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    row.push(d)
    if (row.length === 7) { calendarRows.push(row); row = [] }
  }
  if (row.length) calendarRows.push(row)

  return (
    <>
      <TopNav title="Posting schedule" tabs={[
          { label: 'Clients', href: '/manager/clients' },
          { label: 'Calendar', href: '/manager/calendar' },
          { label: 'Editors\' den', href: '/manager/den' },
          { label: 'Posting schedule', href: '#' },
          { label: 'Content planner', href: '/manager/planner' },
        ]} showSearch searchPlaceholder="Search posts…" rightSlot={<button className="btn-dark">+ Schedule a post</button>} />
      <div className="scope-banner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Scoped to {myClientIds.map(id => clients.find(c => c.id === id)?.name).filter(Boolean).join(' and ')}
      </div>
      <div className="grid">
        <div className="card">
          <div className="card-head"><span className="card-title">{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</span></div>
          <div style={{ padding: '10px 18px' }}>
            <div className="cal-grid">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="cal-dow">{d}</div>)}
              {calendarRows.flat().map((day, i) => {
                if (day === null) return <div key={i} className="cal-day is-empty" />
                const isToday = day === new Date().getDate()
                const hasEvent = myScheduled.some(p => new Date(p.scheduled_at).getDate() === day && new Date(p.scheduled_at).getMonth() === selMonth)
                return <div key={i} className={`cal-day ${isToday ? 'is-today' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setSelDate(day)}>
                  <span className="cal-daynum">{day}</span>
                  {hasEvent && <span className="cal-chip c--ram">·</span>}
                </div>
              })}
            </div>
          </div>
        </div>
        <div className="card" style={{ padding: '22px' }}>
          <div className="card-title" style={{ marginBottom: 14 }}>{selDate ? new Date(new Date().getFullYear(), selMonth, selDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Select a date'}</div>
          {dayItems.length === 0 ? (
            <EmptyState title="Nothing scheduled" subtitle="No posts for this day." />
          ) : dayItems.map(p => {
            const ci = contentItems.find(c => c.id === p.content_item_id)
            const client = ci ? clients.find(c => c.id === ci.client_id) : null
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid #F1F1F8' }}>
                <div className="queue-icon q--pink" style={{ background: 'var(--pink)', color: 'var(--pink-ink)', width: 38, height: 38, borderRadius: 13, display: 'grid', placeItems: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>{ci?.title || '—'}</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: 3 }}>{new Date(p.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · {client?.name}</div>
                </div>
                <Tag variant="lav">{ci?.type}</Tag>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
