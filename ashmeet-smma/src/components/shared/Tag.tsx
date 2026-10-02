import React from 'react'

type TagVariant = 'mint' | 'sky' | 'lav' | 'amber' | 'pink' | 'grey'

interface TagProps {
  variant?: TagVariant
  children: React.ReactNode
}

export function Tag({ variant = 'grey', children }: TagProps) {
  return <span className={`tag t--${variant}`}>{children}</span>
}
