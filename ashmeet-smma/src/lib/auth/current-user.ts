import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { SUPPORT_COOKIE, SUPPORT_MAX_SECONDS, verify } from '@/lib/platform/signed'
import type { User } from '@/types/database'

/** Set while a platform owner is viewing an agency for support. The banner and the write guard both read it. */
export type SupportInfo = { sessionId: string; agencyId: string; agencyName: string; startedAt: string; elevatedUntil: string | null }
export type SessionUser = User & { support?: SupportInfo }

export type SessionState = { user: SessionUser | null; suspended: boolean }

async function baseUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  const { data } = await supabaseAdmin.from('users').select('*').eq('auth_user_id', user.id).eq('is_active', true).maybeSingle()
  const person = data as User | null
  return person && user.email?.toLowerCase() === person.email.toLowerCase() ? person : null
}

/** The signed-in platform owner as themselves, ignoring any support session. Used by the platform console. */
export const getPlatformOwner = cache(async (): Promise<User | null> => {
  const person = await baseUser()
  return person?.role === 'platform_owner' ? person : null
})

/**
 * Resolves the signed-in person. Two cross-cutting rules live here so no screen can forget them:
 *  - a user of a suspended agency does not resolve (and the caller can tell why, to show a clear message);
 *  - a platform owner inside a valid support session resolves as a read-only admin of the viewed agency.
 */
export const getSessionState = cache(async (): Promise<SessionState> => {
  const person = await baseUser()
  if (!person) return { user: null, suspended: false }
  if (person.role === 'platform_owner') {
    const sessionId = verify(SUPPORT_COOKIE, (await cookies()).get(SUPPORT_COOKIE)?.value)
    if (!sessionId) return { user: person, suspended: false }
    const { data: session } = await supabaseAdmin.from('support_sessions').select('*').eq('id', sessionId).eq('platform_user_id', person.id).is('ended_at', null).maybeSingle()
    if (!session) return { user: person, suspended: false }
    if (Date.now() - Date.parse(session.started_at) > SUPPORT_MAX_SECONDS * 1000) {
      await endSupportSession(session.id, person.id, session.agency_id, session.started_at, 'expired')
      return { user: person, suspended: false }
    }
    const { data: agency } = await supabaseAdmin.from('agencies').select('id,name,display_name').eq('id', session.agency_id).maybeSingle()
    if (!agency) return { user: person, suspended: false }
    const elevated = session.elevated_until && Date.parse(session.elevated_until) > Date.now() ? session.elevated_until : null
    // Role "admin" so every admin screen renders the agency's real data; writes are refused by the proxy and by the database
    // (actor id stays the platform owner, who is not an admin in any agency).
    return { user: { ...person, role: 'admin', agency_id: session.agency_id,
      support: { sessionId: session.id, agencyId: agency.id, agencyName: agency.display_name || agency.name, startedAt: session.started_at, elevatedUntil: elevated } }, suspended: false }
  }
  const { data: agency } = await supabaseAdmin.from('agencies').select('status').eq('id', person.agency_id).maybeSingle()
  if (agency?.status === 'suspended') return { user: null, suspended: true }
  return { user: person, suspended: false }
})

export async function getCurrentUser(): Promise<SessionUser | null> {
  return (await getSessionState()).user
}

/** Closes a support session and records the duration in the viewed agency's audit trail. */
export async function endSupportSession(sessionId: string, platformUserId: string, agencyId: string, startedAt: string, reason: 'exited' | 'expired') {
  const endedAt = new Date()
  const { data: closed } = await supabaseAdmin.from('support_sessions').update({ ended_at: endedAt.toISOString(), end_reason: reason })
    .eq('id', sessionId).is('ended_at', null).select('id').maybeSingle()
  if (!closed) return
  await supabaseAdmin.from('activity_log').insert({ id: crypto.randomUUID(), agency_id: agencyId, actor_id: platformUserId, actor_type: 'user', entity_type: 'platform', entity_id: sessionId,
    action: reason === 'expired' ? 'support_expired' : 'support_exited',
    metadata: { started_at: startedAt, ended_at: endedAt.toISOString(), duration_seconds: Math.round((endedAt.getTime() - Date.parse(startedAt)) / 1000) } })
}
