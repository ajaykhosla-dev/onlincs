import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { ApproveFlow, PinForm } from '@/components/approve/ApproveFlow'
import { hasApprovalSession, requestMeta, resolveLink, type LinkState } from '@/lib/phase6/client-link'
import { supabaseAdmin } from '@/lib/supabase/admin'
import '@/styles/screens/approve.css'
import { pushAfterResponse } from '@/lib/push/send'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Review your video',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

const NOTICES: Record<Exclude<LinkState, 'active'>, { glyph: 'ok' | 'warn' | 'bad'; mark: string; title: string; body: string }> = {
  invalid: { glyph: 'bad', mark: '?', title: 'This link is not valid', body: 'Check that you copied the whole link, or ask your contact for a new one.' },
  expired: { glyph: 'warn', mark: '!', title: 'This link has expired', body: 'Links stay open for 7 days. Ask your contact to send you a new one.' },
  revoked: { glyph: 'warn', mark: '!', title: 'This link is no longer active', body: 'It was replaced or withdrawn. Ask your contact for the latest link.' },
  responded: { glyph: 'ok', mark: '✓', title: 'You have already responded', body: 'Your response was received. There is nothing more to do here.' },
  locked: { glyph: 'bad', mark: '!', title: 'Too many incorrect PINs', body: 'This link is locked for your safety. Ask your contact to send you a new one.' },
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="approve-page"><div className="approve-card">{children}</div></main>
}

export default async function ApprovePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const resolved = await resolveLink(token)
  if (resolved.state !== 'active' || !resolved.link) {
    const state = resolved.state === 'active' ? 'invalid' : resolved.state
    const notice = NOTICES[state]
    const body = state === 'responded' && resolved.link?.response
      ? (resolved.link.response === 'approved' ? 'You approved this video. There is nothing more to do here.' : 'You asked for changes. We will send you a new version.')
      : notice.body
    return <Shell><div className="approve-notice" role="status">
      <div className={`glyph ${notice.glyph}`} aria-hidden="true">{notice.mark}</div><h1>{notice.title}</h1><p>{body}</p></div></Shell>
  }
  if (!await hasApprovalSession(resolved.link.id)) return <Shell><PinForm token={token} brand={resolved.link.client_name} /></Shell>

  // Every render of the video page is a view: recorded with IP and user agent; viewed_at sets on the first.
  const meta = requestMeta(await headers())
  await supabaseAdmin.rpc('phase6_record_view', { p_link_id: resolved.link.id, p_ip: meta.ip, p_user_agent: meta.userAgent })
  pushAfterResponse()
  return <Shell><ApproveFlow token={token} brand={resolved.link.client_name} title={resolved.title ?? 'Your video'} /></Shell>
}
