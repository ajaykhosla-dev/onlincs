import type { CSSProperties, ReactNode } from 'react'

export type TagVariant = 'grey' | 'lav' | 'amber' | 'pink' | 'mint' | 'sky'

/** Pastel status pill. The meaning is always carried by the text, never by colour alone. */
export function Tag({ variant = 'grey', style, children }: { variant?: TagVariant; style?: CSSProperties; children: ReactNode }) {
  return (
    <span className={`tag t--${variant}`} style={style}>
      {children}
    </span>
  )
}
