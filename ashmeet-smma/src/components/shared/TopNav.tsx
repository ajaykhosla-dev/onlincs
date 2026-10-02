'use client'

import React from 'react'

interface TopNavTab {
  label: string
  href: string
}

interface TopNavProps {
  title: string
  tabs?: TopNavTab[]
  showSearch?: boolean
  searchPlaceholder?: string
  rightSlot?: React.ReactNode
}

export function TopNav({
  title,
  tabs,
  showSearch,
  searchPlaceholder = 'Search anything…',
  rightSlot,
}: TopNavProps) {
  return (
    <nav className="topnav">
      {tabs?.map(t => (
        <a
          key={t.href}
          href={t.href}
          className={`tab ${t.href === '#' ? 'is-active' : ''}`}
        >
          {t.label}
        </a>
      ))}
      {showSearch && (
        <div className="search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input type="text" placeholder={searchPlaceholder} />
        </div>
      )}
      {rightSlot && <div className="nav-right">{rightSlot}</div>}
    </nav>
  )
}
