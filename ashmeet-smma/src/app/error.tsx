'use client'

import { RouteError } from '@/components/shared/RouteError'

export default function RootError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--page)' }}><RouteError {...props} area="app" /></main>
}
