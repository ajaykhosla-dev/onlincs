import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { endSupportSession } from '@/lib/auth/current-user'
import { platformApi } from '@/lib/platform/auth'
import { ELEVATION_COOKIE, SUPPORT_COOKIE, verify } from '@/lib/platform/signed'
import { supabaseAdmin } from '@/lib/supabase/admin'

/** Leaves the support session: closes it with its duration and clears both cookies so no access remains. */
export async function POST(request: Request) {
  const guard = await platformApi()
  if ('response' in guard) return guard.response
  const sessionId = verify(SUPPORT_COOKIE, (await cookies()).get(SUPPORT_COOKIE)?.value)
  const query = supabaseAdmin.from('support_sessions').select('id,agency_id,started_at').eq('platform_user_id', guard.user.id).is('ended_at', null)
  const { data: open } = await (sessionId ? query.eq('id', sessionId) : query)
  for (const session of open ?? []) await endSupportSession(session.id, guard.user.id, session.agency_id, session.started_at, 'exited')
  const response = NextResponse.redirect(new URL('/platform', request.url), 303)
  response.cookies.delete(SUPPORT_COOKIE); response.cookies.delete(ELEVATION_COOKIE)
  return response
}
