import { SupportElevate } from './SupportElevate'
import type { SessionUser } from '@/lib/auth/current-user'

/**
 * Pinned to the top of every workspace screen while a platform owner is inside an agency. There is no way to dismiss it:
 * the only control that removes it is "Exit support session", which ends the session and clears the access.
 */
export function SupportBanner({ user }: { user: SessionUser }) {
  if (!user.support) return null
  const until = user.support.elevatedUntil
  return <div className="support-banner" role="status" aria-live="polite">
    <span>SUPPORT SESSION · viewing <b>{user.support.agencyName}</b> · {until ? `changes enabled until ${new Date(until).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true })}` : 'read-only'}</span>
    {!until && <SupportElevate />}
    <form action="/api/platform/support/exit" method="post"><button type="submit">Exit support session</button></form>
  </div>
}
