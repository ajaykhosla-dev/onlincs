'use client'

import type { ReactNode } from 'react'

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export type MonthDay = {
  /** Content after the day number (chips, tags). */
  children?: ReactNode
  /** Makes the day a button. */
  onClick?: () => void
  ariaLabel?: string
  /** Render children as their own controls, separate from the day button. */
  interactiveChildren?: boolean
}

/**
 * The Monday-first month grid used by Calendar, Posting schedule and Content planner.
 * Days that carry content render as buttons, the rest as plain cells, as in the prototypes.
 */
export function MonthGrid({
  year,
  month,
  today,
  todayLabel,
  days,
}: {
  year: number
  /** 0-based month index */
  month: number
  /** Day-of-month to outline as today (only when it belongs to the displayed month) */
  today?: number
  todayLabel?: string
  days: Record<number, MonthDay>
}) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leading = (new Date(year, month, 1).getDay() + 6) % 7 // Monday-first

  const cells: ReactNode[] = []
  for (let i = 0; i < leading; i++) cells.push(<div key={`e${i}`} className="cal-day is-empty" />)
  for (let d = 1; d <= daysInMonth; d++) {
    const info = days[d]
    const isToday = d === today
    const cls = `cal-day${isToday ? ' is-today' : ''}`
    const label = info?.ariaLabel ?? (isToday ? todayLabel : undefined)
    const body = (
      <>
        <span className="cal-daynum">{d}</span>
        {info?.children}
      </>
    )
    cells.push(
      info?.interactiveChildren ? (
        <div key={d} className={cls}>
          <button type="button" className="cal-daynum" onClick={info.onClick} aria-label={label}>{d}</button>
          {info.children}
        </div>
      ) : info?.onClick ? (
        <button key={d} type="button" className={cls} onClick={info.onClick} aria-label={label}>
          {body}
        </button>
      ) : (
        <div key={d} className={cls} aria-label={label}>
          {body}
        </div>
      )
    )
  }

  return (
    <div className="cal-grid">
      {DOW.map((d) => (
        <div key={d} className="cal-dow">
          {d}
        </div>
      ))}
      {cells}
    </div>
  )
}
