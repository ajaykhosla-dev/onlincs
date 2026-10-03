'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { IconCalendar, IconUpload } from '@/components/shared/icons'

/** Two-item bottom tab bar, shown on mobile only (the rail takes over from 761px). */
export function TabBar() {
  const pathname = usePathname()
  const items = [
    { href: '/cameraman/shoots', label: 'Calendar', short: 'Calendar', icon: <IconCalendar w={2} /> },
    { href: '/cameraman/pending', label: 'Pending uploads', short: 'Pending', icon: <IconUpload w={2} /> },
  ]
  return (
    <nav className="tabbar" aria-label="Primary">
      {items.map((i) => {
        const active = pathname.startsWith(i.href)
        return (
          <Link key={i.href} href={i.href} className={`tabbar-btn${active ? ' is-active' : ''}`} aria-current={active ? 'page' : undefined} aria-label={i.label}>
            {i.icon}
            <span>{i.short}</span>
          </Link>
        )
      })}
    </nav>
  )
}
