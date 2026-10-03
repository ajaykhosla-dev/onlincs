'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

export type RailItem = {
  key: string
  label: string
  href: string
  icon: ReactNode
  badge?: number | string
}

/** The violet gradient sidebar. Active state follows the URL. `foot` items sit behind the hairline divider. */
export function Rail({ initials, items, foot }: { initials: string; items: RailItem[]; foot?: RailItem[] }) {
  const pathname = usePathname()
  const isActive = (i: RailItem) => pathname === i.href || pathname.startsWith(i.href + '/')

  const button = (i: RailItem) => {
    const active = isActive(i)
    return (
      <Link
        key={i.key}
        href={i.href}
        className={`rail-btn${active ? ' is-active' : ''}`}
        aria-current={active ? 'page' : undefined}
        aria-label={i.label}
      >
        {i.icon}
        {i.badge !== undefined && <span className="rail-badge">{i.badge}</span>}
        <span className="tip">{i.label}</span>
      </Link>
    )
  }

  return (
    <aside className="rail">
      <div className="rail-inner">
        <div className="rail-logo">{initials}</div>
        {items.map(button)}
        {foot && foot.length > 0 && <div className="rail-foot">{foot.map(button)}</div>}
      </div>
    </aside>
  )
}
