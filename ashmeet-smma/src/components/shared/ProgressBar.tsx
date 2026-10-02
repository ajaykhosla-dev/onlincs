import React from 'react'

interface ProgressBarProps {
  value: number
  max?: number
  label?: string
  variant?: 'default' | 'warn' | 'done'
}

export function ProgressBar({ value, max = 100, label, variant }: ProgressBarProps) {
  const pct = (value / max) * 100

  return (
    <div>
      {label && <span className="scope-pct">{label}</span>}
      <div className="track">
        <i
          className={variant}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
