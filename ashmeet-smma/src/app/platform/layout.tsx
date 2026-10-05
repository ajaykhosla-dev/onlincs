import Link from 'next/link'
import type { Metadata } from 'next'
import { requirePlatformOwner } from '@/lib/platform/auth'
import '@/styles/screens/review.css'
import '@/styles/screens/platform.css'

export const metadata: Metadata = { title: 'RapidArc Platform', robots: { index: false, follow: false } }

/**
 * The control plane. Visually separate from every agency workspace (dark chrome, a PLATFORM badge) so you always know which
 * plane you are in. Only the platform owner gets past this layout; everyone else is refused with a 403.
 */
export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const owner = await requirePlatformOwner({ requireMfa: false })
  return <div className="platform-root">
    <header className="platform-bar">
      <div className="platform-brand"><span className="platform-badge">PLATFORM</span><strong>RapidArc console</strong></div>
      <nav aria-label="Platform"><Link href="/platform">Agencies</Link></nav>
      <div className="platform-user">{owner.full_name}
        <form action="/auth/signout" method="post"><button type="submit">Sign out</button></form></div>
    </header>
    <main className="platform-main">{children}</main>
  </div>
}
