'use client'
import { TopNav } from '@/components/shared'
import { shoots, clients, users } from '@/lib/fixtures'

export default function AdminCalendarPage() {
  const now = new Date()
  const monthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' })
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const startDow = firstDay.getDay()
  const today = now.getDate()

  const events: Record<number, { client: string; color: string }[]> = {}
  shoots.forEach((s) => {
    const d = new Date(s.scheduled_start)
    if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
      const day = d.getDate()
      const client = clients.find((c) => c.id === s.client_id)
      const colorMap: Record<string, string> = {
        'cl-1': 'c--ram',
        'cl-2': 'c--grv',
        'cl-3': 'c--sdh',
        'cl-4': 'c--sdh',
        'cl-5': 'c--bsl',
        'cl-6': 'c--bsl',
      }
      if (!events[day]) events[day] = []
      events[day].push({ client: client?.name || '—', color: colorMap[s.client_id] || 'c--ram' })
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
          { label: 'Clients', href: '/admin/clients' },
          { label: 'Calendar', href: '#' },
          { label: 'Editors\' den', href: '/admin/den' },
          { label: 'Posting schedule', href: '/admin/posting' },
          { label: 'Content planner', href: '/admin/planner' },
          { label: 'Team', href: '/admin/team' },
          { label: 'Settings', href: '/admin/settings' },
        ]}
        showSearch
        searchPlaceholder="Search calendar…"
      />

      <div className="card" style={{ marginBottom: 22 }}>
        <div className="card-head">
          <span className="card-title">{monthLabel}</span>
        </div>
        <div style={{ padding: '18px 22px 10px' }}>
          <div className="cal-grid">
            {dows.map((d) => (
              <div key={d} className="cal-dow">
                {d}
              </div>
            ))}
            {cells.map((day, i) => (
              <div
                key={i}
                className={`cal-day ${day === null ? 'is-empty' : ''} ${day === today ? 'is-today' : ''}`}
              >
                {day && <span className="cal-daynum">{day}</span>}
                {day &&
                  events[day]?.map((ev, j) => (
                    <span key={j} className={`cal-chip ${ev.color}`}>
                      {ev.client}
                    </span>
                  ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <span className="card-title">Upcoming shoots</span>
        </div>
        {shoots.filter((s) => new Date(s.scheduled_start) >= now).slice(0, 5).map((s) => {
          const client = clients.find((c) => c.id === s.client_id)
          const cameraman = users.find((u) => u.id === s.cameraman_id)
          return (
            <div key={s.id} className="queue-item" style={{ padding: '14px 22px' }}>
              <div
                className="queue-icon q--lav"
                style={{ background: 'var(--violet-soft)', color: 'var(--violet-deep)' }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div className="queue-body">
                <div className="queue-title">{s.title}</div>
                <div className="queue-meta">
                  {client?.name} ·{' '}
                  {new Date(s.scheduled_start).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
              <div className="queue-age" style={{ color: 'var(--violet-deep)' }}>
                {cameraman?.full_name}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
