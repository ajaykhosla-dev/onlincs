'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, type ReactNode } from 'react'
import { SignOutButton } from './SignOutButton'

export type RailItem = {
  key: string
  label: string
  /** Shorter label for the mobile tab bar. Falls back to `label`. */
  short?: string
  href: string
  icon: ReactNode
  badge?: number | string
}

/**
 * The violet gradient sidebar. Active state follows the URL. `foot` items sit behind the hairline divider.
 * Below 761px the rail is hidden and the same items render as a bottom tab bar instead.
 */
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
    <>
      <aside className="rail">
        <div className="rail-inner">
          <div className="rail-logo">{initials}</div>
          {items.map(button)}
          {foot && foot.length > 0 && <div className="rail-foot">{foot.map(button)}</div>}
          <SignOutButton />
        </div>
      </aside>
      <TabBar items={[...items, ...(foot ?? [])]} isActive={isActive} />
    </>
  )
}

/** Bottom tab bar for phones. Scrolls sideways when a role has more items than fit. */
function TabBar({ items, isActive }: { items: RailItem[]; isActive: (i: RailItem) => boolean }) {
  const ref = useRef<HTMLElement>(null)
  const active = items.find(isActive)?.key

  useEffect(() => {
    // Keep the current tab visible when the bar overflows.
    ref.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [active])

  if (items.length === 0) return null
  return (
    <nav ref={ref} className={`tabbar${items.length > 5 ? ' is-scroll' : ''}`} aria-label="Primary">
      {items.map((i) => {
        const on = isActive(i)
        return (
          <Link key={i.key} href={i.href} className={`tabbar-btn${on ? ' is-active' : ''}`} aria-current={on ? 'page' : undefined} aria-label={i.label}>
            <span className="tabbar-icon">
              {i.icon}
              {i.badge !== undefined && <span className="tabbar-badge">{i.badge}</span>}
            </span>
            <span>{i.short ?? i.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
