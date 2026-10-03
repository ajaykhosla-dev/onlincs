'use client'

import { useState, type ReactNode } from 'react'
import { IconBell, IconGear, IconMoon, IconSearch, IconSun } from './icons'
import { SignOutButton } from './SignOutButton'

export type TopNavTab = { label: string; icon: ReactNode; active?: boolean }

/**
 * Top navigation. Every slot is optional: Editor and Cameraman use a reduced version.
 * The Light/Dark segment is visual only (no persistence), exactly as in the prototype.
 */
export function TopNav({
  tabs,
  searchPlaceholder,
  appearance = true,
  bell = true,
  gearLabel,
  user,
  children,
}: {
  tabs?: TopNavTab[]
  searchPlaceholder?: string
  appearance?: boolean
  bell?: boolean
  gearLabel?: string
  user?: { full_name: string; initials: string; avatar_gradient: string }
  children?: ReactNode
}) {
  const [mode, setMode] = useState<'light' | 'dark'>('light')

  return (
    <nav className="topnav">
      {tabs?.map((t) => (
        <a key={t.label} href="#" className={`tab${t.active ? ' is-active' : ''}`} onClick={(e) => e.preventDefault()}>
          {t.icon}
          {t.label}
        </a>
      ))}

      {searchPlaceholder && (
        <div className="search">
          <IconSearch />
          <input type="search" placeholder={searchPlaceholder} aria-label="Search" />
        </div>
      )}

      <div className="nav-right">
        {user && (
          <div className="nav-user" aria-label={`Signed in as ${user.full_name}`}>
            <span className="nav-user-name">{user.full_name}</span>
            <span className="nav-user-avatar" style={{ background: user.avatar_gradient }}>{user.initials}</span>
          </div>
        )}
        {user && <SignOutButton variant="topnav" />}
        {appearance && (
          <div className="seg" role="group" aria-label="Appearance">
            <button type="button" className={mode === 'light' ? 'is-active' : undefined} onClick={() => setMode('light')}>
              <IconSun />
              Light
            </button>
            <button type="button" className={mode === 'dark' ? 'is-active' : undefined} onClick={() => setMode('dark')}>
              <IconMoon />
              Dark
            </button>
          </div>
        )}
        {bell && (
          <button type="button" className="ghost" aria-label="Notifications">
            <IconBell />
            <span className="dot"></span>
          </button>
        )}
        {gearLabel && (
          <button type="button" className="ghost" aria-label={gearLabel}>
            <IconGear />
          </button>
        )}
        {children}
      </div>
    </nav>
  )
}
