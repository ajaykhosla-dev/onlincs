import type { CSSProperties, ReactNode } from 'react'

/** Centred "nothing here" block with an optional action. */
export function EmptyState({ message, action, style }: { message: ReactNode; action?: ReactNode; style?: CSSProperties }) {
  return (
    <div className="empty" style={style}>
      <p>{message}</p>
      {action}
    </div>
  )
}
