'use client'

import type { ReactNode } from 'react'
import { IconChevronDown } from './icons'

/** A pill-shaped select with the chevron overlay. */
export function PillSelect({ label, options, defaultValue }: { label: string; options: string[]; defaultValue?: string }) {
  return (
    <div className="pill-select">
      <select aria-label={label} defaultValue={defaultValue}>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
      <IconChevronDown />
    </div>
  )
}

/** The filter bar: a label, pill selects (children), and optionally the Reset link and Apply button. */
export function FilterStrip({ label, actions = false, children }: { label: string; actions?: boolean; children: ReactNode }) {
  return (
    <section className="filters">
      <span className="filters-label">{label}</span>
      {children}
      {actions && (
        <>
          <a href="#" className="link-clear" onClick={(e) => e.preventDefault()}>
            Reset
          </a>
          <button type="button" className="btn-dark">
            Apply
          </button>
        </>
      )}
    </section>
  )
}
