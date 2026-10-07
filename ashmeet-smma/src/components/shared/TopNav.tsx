/* eslint-disable @next/next/no-img-element -- a data-URL QR code and an agency-supplied logo URL cannot go through next/image */
'use client'

import type { ReactNode } from 'react'
import { IconSearch } from './icons'
import { SignOutButton } from './SignOutButton'

export type TopNavTab = { label: string; icon: ReactNode; active?: boolean }

/**
 * Top navigation. Every slot is optional: Editor and Cameraman use a reduced version.
 */
export function TopNav({
  tabs,
  searchPlaceholder,
  user,
  agency,
  children,
}: {
  tabs?: TopNavTab[]
  searchPlaceholder?: string
  user?: { full_name: string; initials: string; avatar_gradient: string }
  /** Light white-labelling: this agency's display name and logo. */
  agency?: { name: string; logo_url: string | null }
  children?: ReactNode
}) {
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
        {children}
        {agency && <div className="nav-agency" title={agency.name}>{agency.logo_url && <img src={agency.logo_url} alt="" width={22} height={22} />}<span>{agency.name}</span></div>}
        {user && (
          <div className="nav-user" aria-label={`Signed in as ${user.full_name}`}>
            <span className="nav-user-name">{user.full_name}</span>
            <span className="nav-user-avatar" style={{ background: user.avatar_gradient }}>{user.initials}</span>
          </div>
        )}
        {user && <SignOutButton variant="topnav" />}
      </div>
    </nav>
  )
}
