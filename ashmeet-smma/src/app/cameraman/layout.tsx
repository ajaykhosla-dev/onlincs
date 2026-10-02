'use client'
import { Rail } from '@/components/shared'
import { usePathname } from 'next/navigation'
import React from 'react'

function IconCamera() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
  )
}

const iconMap: Record<string, React.ReactNode> = {
  '/cameraman/shoots': <IconCamera />,
  '/cameraman/pending': <IconCamera />,
}

export default function CameramanLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const baseItems = [
    { label: 'Shoots', href: '/cameraman/shoots' },
    { label: 'Pending', href: '/cameraman/pending' },
  ]
  const items = baseItems.map(it => ({ ...it, active: pathname === it.href, icon: iconMap[it.href]! }))
  return (
    <div className="shell">
      <Rail items={items} logoText="RA" />
      <main className="main">{children}</main>
    </div>
  )
}
