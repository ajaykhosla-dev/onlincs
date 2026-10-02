'use client'
import { useState } from 'react'
import { Rail } from '@/components/shared'
import { usePathname } from 'next/navigation'

function IconTask() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
  )
}
function IconLibrary() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
  )
}

const iconMap: Record<string, React.ReactNode> = {
  '/editor': <IconTask />,
  '/editor/redo': <IconTask />,
  '/editor/library': <IconLibrary />,
}

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const baseItems = [
    { label: 'My Tasks', href: '/editor' },
    { label: 'Redo', href: '/editor/redo' },
    { label: 'Library', href: '/editor/library' },
  ]
  const items = baseItems.map(it => ({ ...it, active: pathname === it.href, icon: iconMap[it.href]! }))
  return (
    <div className="shell">
      <Rail items={items} logoText="RA" />
      <main className="main">{children}</main>
    </div>
  )
}
