'use client'

import { useState, type ReactNode } from 'react'
import { MonthGrid, type MonthDay } from './MonthGrid'
import { PlanModal } from './PlanModal'
import { EmptyState, FilterStrip, PillSelect, Tag } from '@/components/shared'
import { IconDen } from '@/components/shared/icons'
import type { PlanItem } from '@/lib/fixtures/console-screens'

type Selection = { kind: 'item'; key: string } | { kind: 'empty'; label: string }

/**
 * Content planner: pick a client, then a calendar (or list) of what gets made and when.
 * Shared by Admin and Brand Manager; the caller scopes the client options.
 */
export function PlannerScreen({
  banner,
  intro,
  clientOptions,
  planClient,
  plans,
  emptyDay,
}: {
  banner?: ReactNode
  intro: string
  clientOptions: string[]
  planClient: string
  plans: PlanItem[]
  emptyDay: { day: number; label: string; short: string }
}) {
  const [view, setView] = useState<'calendar' | 'list'>('calendar')
  const [selection, setSelection] = useState<Selection>({ kind: 'item', key: plans[0].key })
  const [planOpen, setPlanOpen] = useState(false)

  const selected = selection.kind === 'item' ? plans.find((p) => p.key === selection.key) : undefined

  const days: Record<number, MonthDay> = {}
  for (const p of plans) {
    days[p.day] = {
      onClick: () => setSelection({ kind: 'item', key: p.key }),
      children: (
        <>
          <span className="cal-chip c--ram">{p.type}</span>
          <Tag variant={p.stage.tone} style={{ fontSize: '9.5px', padding: '2px 7px' }}>
            {p.stage.label}
          </Tag>
        </>
      ),
    }
  }
  days[emptyDay.day] = { onClick: () => setSelection({ kind: 'empty', label: emptyDay.label }) }

  return (
    <>
      {banner}
      <section className="hero-row" style={{ gridTemplateColumns: '1fr' }}>
        <div className="hello">
          <h1>
            Content planner<span className="light">Plan the month before you shoot it</span>
          </h1>
          <p>{intro}</p>
        </div>
      </section>

      <FilterStrip label="Client">
        <PillSelect label="Client" options={clientOptions} defaultValue={planClient} />
        <div className="seg" role="group" aria-label="View" style={{ marginLeft: 'auto' }}>
          <button
            type="button"
            className={view === 'calendar' ? 'is-active' : undefined}
            onClick={() => setView('calendar')}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="18" rx="4" />
              <path d="M3 10h18" />
            </svg>
            Calendar
          </button>
          <button type="button" className={view === 'list' ? 'is-active' : undefined} onClick={() => setView('list')}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            List
          </button>
        </div>
      </FilterStrip>

      <div className="grid">
        <section className="card" style={{ padding: '22px 26px' }}>
          <div className="card-head" style={{ padding: '0 0 16px' }}>
            <div className="card-title">September 2026 &middot; {planClient}</div>
          </div>
          {view === 'calendar' ? (
            <MonthGrid year={2026} month={8} today={23} days={days} />
          ) : (
            <div className="queue">
              {plans.map((p) => (
                <div key={p.key} className={`queue-item q--${p.tone}`}>
                  <div className="queue-icon">
                    <IconDen w={2} />
                  </div>
                  <div className="queue-body">
                    <div className="queue-title">{p.name}</div>
                    <div className="queue-meta">
                      {p.panelTitle} &middot; {p.meta}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="side">
          <section className="card queue">
            <div className="card-head" style={{ padding: '0 0 4px' }}>
              <div className="card-title">{selected ? selected.panelTitle : emptyDay.label}</div>
            </div>
            {selected ? (
              <div className={`queue-item q--${selected.tone}`}>
                <div className="queue-icon">
                  <IconDen w={2} />
                </div>
                <div className="queue-body">
                  <div className="queue-title">{selected.name}</div>
                  <div className="queue-meta">{selected.meta}</div>
                </div>
              </div>
            ) : (
              <EmptyState
                style={{ padding: '28px 8px' }}
                message={<>Nothing planned for {emptyDay.label}.</>}
                action={
                  <button type="button" className="btn-dark" onClick={() => setPlanOpen(true)}>
                    Plan
                  </button>
                }
              />
            )}
          </section>
        </aside>
      </div>

      <PlanModal open={planOpen} onClose={() => setPlanOpen(false)} dateLabel={emptyDay.short} />
    </>
  )
}
