'use client'
import { useState } from 'react'
import { Rail } from '@/components/shared'
import { usePathname } from 'next/navigation'

function IconOverview() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
  )
}
function IconClients() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>
  )
}
function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
  )
}
function IconPosting() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
  )
}
function IconPlanner() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
  )
}
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
function IconCamera() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
  )
}

const iconMap: Record<string, React.ReactNode> = {
  '/manager': <IconOverview />,
  '/manager/clients': <IconClients />,
  '/manager/calendar': <IconCalendar />,
  '/manager/posting': <IconPosting />,
  '/manager/planner': <IconPlanner />,
  '/editor': <IconTask />,
  '/editor/redo': <IconTask />,
  '/editor/library': <IconLibrary />,
  '/cameraman/shoots': <IconCamera />,
  '/cameraman/pending': <IconCamera />,
}

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const baseItems = [
    { label: 'Overview', href: '/manager' },
    { label: 'Clients', href: '/manager/clients' },
    { label: 'Calendar', href: '/manager/calendar' },
    { label: 'Posting', href: '/manager/posting' },
    { label: 'Planner', href: '/manager/planner' },
  ]
  const items = baseItems.map(it => ({ ...it, active: pathname === it.href, icon: iconMap[it.href]! }))
  return (
    <div className="shell">
      <Rail items={items} logoText="RA" />
      <main className="main">{children}</main>
    </div>
  )
}
