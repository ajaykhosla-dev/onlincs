import React from 'react'

type MetricTheme = 'violet' | 'amber' | 'pink' | 'mint' | 'sky'

interface MetricCardProps {
  label: string
  value: string
  delta?: string
  icon?: React.ReactNode
  theme?: MetricTheme
}

const themeClassMap: Record<MetricTheme, string> = {
  violet: 'm--violet',
  amber: 'm--amber',
  pink: 'm--pink',
  mint: 'm--mint',
  sky: 'm--sky',
}

export function MetricCard({ label, value, delta, icon, theme = 'violet' }: MetricCardProps) {
  return (
    <div className={`metric ${themeClassMap[theme]}`}>
      <div className="metric-top">
        <div className="metric-icon">{icon}</div>
        {delta && <span className="metric-delta">{delta}</span>}
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
    </div>
  )
}
