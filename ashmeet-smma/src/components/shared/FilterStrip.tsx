'use client'

import React from 'react'

interface FilterOption {
  value: string
  label: string
}

interface FilterDef {
  key: string
  label: string
  options: FilterOption[]
  value: string
}

interface FilterStripProps {
  label: string
  filters: FilterDef[]
  onFilterChange?: (key: string, value: string) => void
  actionSlot?: React.ReactNode
}

export function FilterStrip({ label, filters, onFilterChange, actionSlot }: FilterStripProps) {
  return (
    <div className="filters">
      <span className="filters-label">{label}</span>
      {filters.map(f => (
        <div key={f.key} className="pill-select">
          <select
            value={f.value}
            onChange={e => onFilterChange?.(f.key, e.target.value)}
          >
            {f.options.map(o => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      ))}
      {actionSlot && <>{actionSlot}</>}
    </div>
  )
}
