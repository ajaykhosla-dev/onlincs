import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { endSupportSession } from '@/lib/auth/current-user'
import { parseJsonBody } from '@/lib/api'
import { getAgency } from '@/lib/platform/agencies'
import { platformApi, platformLog } from '@/lib/platform/auth'
import { ELEVATION_COOKIE, ELEVATION_SECONDS, SUPPORT_COOKIE, SUPPORT_MAX_SECONDS, issue, verify } from '@/lib/platform/signed'
import { supabaseAdmin } from '@/lib/supabase/admin'

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('enter'), agencyId: z.string().min(1), reason: z.string().trim().min(3, 'Say why you are opening this agency').max(300) }),
  z.object({ action: z.literal('elevate'), reason: z.string().trim().min(3, 'Say why you need to make a change').max(300) }),
])
const cookieOptions = (seconds: number) => ({ httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: seconds })

/** Enter an agency for support (read-only) or turn on changes for 15 minutes. Both are written to that agency's audit trail. */
export async function POST(request: Request) {
  const guard = await platformApi()
  if ('response' in guard) return guard.response
  const parsed = await parseJsonBody(request, schema)
  if (!parsed.ok) return parsed.response
  const owner = guard.user
  const jar = await cookies()

  if (parsed.value.action === 'enter') {
    const agency = await getAgency(parsed.value.agencyId)
    if (!agency) return NextResponse.json({ message: 'Agency not found' }, { status: 404 })
    // One support session at a time: close any earlier one so durations stay honest.
    const { data: open } = await supabaseAdmin.from('support_sessions').select('id,agency_id,started_at').eq('platform_user_id', owner.id).is('ended_at', null)
    for (const session of open ?? []) await endSupportSession(session.id, owner.id, session.agency_id, session.started_at, 'exited')
    const { data: session, error } = await supabaseAdmin.from('support_sessions').insert({ platform_user_id: owner.id, agency_id: agency.id, reason: parsed.value.reason }).select('id').single()
    if (error || !session) return NextResponse.json({ message: 'Could not start the support session' }, { status: 500 })
    await platformLog(owner, agency.id, 'support_entered', session.id, { reason: parsed.value.reason, read_only: true })
    const response = NextResponse.json({ redirect: '/admin/clients' })
    response.cookies.set(SUPPORT_COOKIE, issue(SUPPORT_COOKIE, session.id, SUPPORT_MAX_SECONDS), cookieOptions(SUPPORT_MAX_SECONDS))
    response.cookies.delete(ELEVATION_COOKIE)
    return response
  }

  const sessionId = verify(SUPPORT_COOKIE, jar.get(SUPPORT_COOKIE)?.value)
  const { data: session } = sessionId ? await supabaseAdmin.from('support_sessions').select('id,agency_id').eq('id', sessionId).eq('platform_user_id', owner.id).is('ended_at', null).maybeSingle() : { data: null }
  if (!session) return NextResponse.json({ message: 'You are not in a support session.' }, { status: 409 })
  const until = new Date(Date.now() + ELEVATION_SECONDS * 1000)
  await supabaseAdmin.from('support_sessions').update({ elevated_at: new Date().toISOString(), elevated_until: until.toISOString() }).eq('id', session.id)
  await platformLog(owner, session.agency_id, 'support_elevated', session.id, { reason: parsed.value.reason, until: until.toISOString() })
  const response = NextResponse.json({ elevatedUntil: until.toISOString() })
  response.cookies.set(ELEVATION_COOKIE, issue(ELEVATION_COOKIE, session.id, ELEVATION_SECONDS), cookieOptions(ELEVATION_SECONDS))
  return response
}
