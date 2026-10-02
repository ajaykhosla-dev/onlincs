'use client'

import React from 'react'

interface RailItem {
  icon: React.ReactNode
  label: string
  href: string
  badge?: number
  active?: boolean
}

interface RailProps {
  items: RailItem[]
  logoText?: string
  appName?: string
}

export function Rail({ items, logoText = 'RA', appName = 'RapidArc AI' }: RailProps) {
  return (
    <div className="rail">
      <div className="rail-inner">
        <div className="rail-logo">{logoText}</div>
        {items.map(item => (
          <a key={item.href} href={item.href} className={`rail-btn ${item.active ? 'is-active' : ''}`}>
            {item.icon}
            {item.badge ? <span className="rail-badge">{item.badge}</span> : null}
            {item.label && <span className="tip">{item.label}</span>}
          </a>
        ))}
      </div>
    </div>
  )
}
