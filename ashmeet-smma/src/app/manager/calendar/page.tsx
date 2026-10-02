'use client'
import { TopNav } from '@/components/shared'
import { shoots, clients, getClientsForManager } from '@/lib/fixtures'

export default function ManagerCalendarPage() {
  const myClients = getClientsForManager('u-2')
  const myShoots = shoots.filter(s => myClients.some(c => c.id === s.client_id))
  const now = new Date()
  const monthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' })
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const startDow = firstDay.getDay()
  const today = now.getDate()

  const events: Record<number, { title: string; color: string }[]> = {}
  myShoots.forEach(s => {
    const d = new Date(s.scheduled_start)
    if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
      const day = d.getDate()
      const colorMap: Record<string, string> = { 'cl-1': 'c--ram', 'cl-2': 'c--grv' }
      if (!events[day]) events[day] = []
      events[day].push({ title: s.title, color: colorMap[s.client_id] || 'c--ram' })
    }
  })

  const dows = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const cells: (number | null)[] = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <>
      <TopNav
        title="Calendar"
        tabs={[
          { label: 'Clients', href: '/manager/clients' },
          { label: 'Calendar', href: '#' },
          { label: 'Editors\' den', href: '/manager/den' },
          { label: 'Posting', href: '/manager/posting' },
          { label: 'Planner', href: '/manager/planner' },
        ]}
        showSearch
        searchPlaceholder="Search calendar…"
      />
      <div className="scope-banner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Scoped to {myClients.map(c => c.name).join(' and ')}
      </div>
      <div className="card">
        <div className="card-head"><span className="card-title">{monthLabel}</span></div>
        <div style={{ padding: '18px 22px 10px' }}>
          <div className="cal-grid">
            {dows.map(d => <div key={d} className="cal-dow">{d}</div>)}
            {cells.map((day, i) => (
              <div key={i} className={`cal-day ${day === null ? 'is-empty' : ''} ${day === today ? 'is-today' : ''}`}>
                {day && <span className="cal-daynum">{day}</span>}
                {day && events[day]?.map((ev, j) => <span key={j} className={`cal-chip ${ev.color}`}>{ev.title}</span>)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
