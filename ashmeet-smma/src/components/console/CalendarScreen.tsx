'use client'

import { useState, type ReactNode } from 'react'
import { MonthGrid, type MonthDay } from './MonthGrid'
import { ShootDrawer } from './ShootDrawer'
import { teamById } from '@/lib/fixtures/console'
import type { ShootCard } from '@/lib/fixtures/console-screens'

const chev = (d: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
)

/** Calendar screen shared by Admin and Brand Manager; the caller scopes `shoots`. */
export function CalendarScreen({ shoots, subtitle, banner, monthNav = true }: { shoots: ShootCard[]; subtitle: string; banner?: ReactNode; monthNav?: boolean }) {
  const [open, setOpen] = useState<ShootCard | null>(null)

  const days: Record<number, MonthDay> = {}
  for (const s of shoots) {
    if (s.day && s.chip) {
      days[s.day] = { onClick: () => setOpen(s), children: <span className={`cal-chip c--${s.chip.tone}`}>{s.chip.label}</span> }
    }
  }

  return (
    <>
      {banner}
      <section className="hero-row" style={{ gridTemplateColumns: '1fr' }}>
        <div className="hello">
          <h1>
            Calendar<span className="light">September 2026</span>
          </h1>
          <p>{subtitle}</p>
        </div>
      </section>

      <div className="grid">
        <section className="card" style={{ padding: '22px 26px' }}>
          <div className="card-head" style={{ padding: '0 0 16px' }}>
            <div className="card-title">September 2026</div>
            {monthNav && (
              <div className="card-tools">
                <button type="button" className="tool" aria-label="Previous month">
                  {chev('m15 18-6-6 6-6')}
                </button>
                <button type="button" className="tool" aria-label="Next month">
                  {chev('m9 18 6-6-6-6')}
                </button>
              </div>
            )}
          </div>
          <MonthGrid year={2026} month={8} today={23} todayLabel="23 September, today, no shoots" days={days} />
        </section>

        <aside className="side">
          <section className="card queue">
            <div className="card-head" style={{ padding: '0 0 4px' }}>
              <div className="card-title">Upcoming shoots</div>
            </div>
            {shoots.map((s) => (
              <button key={s.key} type="button" className="shoot-row" onClick={() => setOpen(s)}>
                <span className="shoot-time">
                  {s.whenLines[0]}
                  <br />
                  {s.whenLines[1]}
                </span>
                <span className="shoot-body">
                  <span className="shoot-client">{s.title}</span>
                  <span className="shoot-meta">
                    {s.clientName} &middot; {teamById(s.cameramanId)?.full_name}
                  </span>
                </span>
              </button>
            ))}
          </section>
        </aside>
      </div>

      <ShootDrawer shoot={open} onClose={() => setOpen(null)} />
    </>
  )
}
