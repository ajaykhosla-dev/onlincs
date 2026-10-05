import 'server-only'
import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { redirect } from 'next/navigation'
import { getPlatformOwner } from '@/lib/auth/current-user'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { User } from '@/types/database'

/** AAL2 means this session has passed a second factor (a TOTP code). */
export async function assuranceLevel(): Promise<{ current: string | null; next: string | null }> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  return { current: data?.currentLevel ?? null, next: data?.nextLevel ?? null }
}

/** Page guard for the platform console: platform owner only, and only after two-factor. Everyone else gets 403. */
export async function requirePlatformOwner(options: { requireMfa: boolean } = { requireMfa: true }): Promise<User> {
  const owner = await getPlatformOwner()
  if (!owner) {
    // Not signed in goes to login; a signed-in agency user must not even learn the console exists.
    const { getCurrentUser } = await import('@/lib/auth/current-user')
    redirect((await getCurrentUser()) ? '/403' : '/auth/login?next=/platform')
  }
  if (options.requireMfa) {
    const { current } = await assuranceLevel()
    if (current !== 'aal2') redirect('/platform/mfa')
  }
  return owner
}

/** Route-handler guard: returns the owner, or the response to send. Two-factor is required here too. */
export async function platformApi(): Promise<{ user: User } | { response: NextResponse }> {
  const owner = await getPlatformOwner()
  if (!owner) return { response: NextResponse.json({ error: 'forbidden', message: 'You do not have access to this resource' }, { status: 403 }) }
  const { current } = await assuranceLevel()
  if (current !== 'aal2') return { response: NextResponse.json({ error: 'mfa_required', message: 'Two-factor authentication is required.' }, { status: 403 }) }
  return { user: owner }
}

/** Every platform action is written to the audit trail of the agency it touched (visible to that agency's admin). Never log values. */
export async function platformLog(owner: User, agencyId: string, action: string, entityId: string, metadata: Record<string, unknown> = {}) {
  await supabaseAdmin.from('activity_log').insert({ id: randomUUID(), agency_id: agencyId, actor_id: owner.id, actor_type: 'user', entity_type: 'platform', entity_id: entityId, action, metadata })
}
