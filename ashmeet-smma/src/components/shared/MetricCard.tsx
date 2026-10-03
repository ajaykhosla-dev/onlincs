import type { ReactNode } from 'react'

export type MetricTone = 'violet' | 'amber' | 'pink' | 'mint' | 'sky'

/** Gradient icon tile, optional badge pill, value, label and note. */
export function MetricCard({
  tone,
  icon,
  badge,
  value,
  label,
  note,
}: {
  tone: MetricTone
  icon: ReactNode
  badge?: string
  value: ReactNode
  label: string
  note: string
}) {
  return (
    <div className={`metric m--${tone}`}>
      <div className="metric-top">
        <div className="metric-icon">{icon}</div>
        {badge && <span className="metric-delta">{badge}</span>}
      </div>
      <div>
        <div className="metric-value">{value}</div>
        <div className="metric-label">{label}</div>
        <div className="metric-note">{note}</div>
      </div>
    </div>
  )
}
