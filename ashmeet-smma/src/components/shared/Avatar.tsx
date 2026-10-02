import React from 'react'

interface AvatarProps {
  name: string
  gradient?: string
  size?: 40 | 32
}

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // convert to 32bit int
  }
  return Math.abs(hash)
}

const GRADIENTS = [
  'linear-gradient(140deg,#8F80F7,#5A4AD8)',
  'linear-gradient(140deg,#F78166,#D94535)',
  'linear-gradient(140deg,#5AD9A5,#1FA772)',
  'linear-gradient(140deg,#F2C96A,#D4A017)',
  'linear-gradient(140deg,#5AB4E8,#1A7EC4)',
  'linear-gradient(140deg,#E878D0,#B83DA0)',
  'linear-gradient(140deg,#5AC8E0,#1A9DB8)',
  'linear-gradient(140deg,#D97A5A,#B84A20)',
]

function deriveGradient(name: string): string {
  return GRADIENTS[hashString(name) % GRADIENTS.length]
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export function Avatar({ name, gradient, size = 40 }: AvatarProps) {
  const isSmall = size === 32

  return (
    <div
      className="avatar-sq"
      style={{
        background: gradient || deriveGradient(name),
        width: size,
        height: size,
        borderRadius: isSmall ? 11 : 14,
        fontSize: isSmall ? '10px' : '12px',
      }}
    >
      {getInitials(name)}
    </div>
  )
}
