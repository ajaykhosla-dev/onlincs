import React from 'react'

interface EmptyStateProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function EmptyState({ title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <p>{title}</p>
      {subtitle && <p className="empty-sub">{subtitle}</p>}
      {action}
    </div>
  )
}
