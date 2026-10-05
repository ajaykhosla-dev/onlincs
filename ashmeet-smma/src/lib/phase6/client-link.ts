import 'server-only'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { hashToken, SESSION_COOKIE, sessionValid, TOKEN_PATTERN } from './tokens'

export type LinkState = 'invalid' | 'revoked' | 'responded' | 'expired' | 'locked' | 'active'
export type ResolvedLink = {
  state: LinkState
  link?: { id: string; agency_id: string; content_item_id: string; version_id: string; pin_hash: string
    response: 'approved' | 'changes' | null; client_name: string }
  title?: string
}

/** Resolves a raw token. A malformed token and a missing row give the same "invalid" answer. */
export async function resolveLink(token: string): Promise<ResolvedLink> {
  if (!TOKEN_PATTERN.test(token)) return { state: 'invalid' }
  const { data: link, error } = await supabaseAdmin.from('approval_links')
    .select('id,agency_id,content_item_id,version_id,pin_hash,expires_at,revoked_at,responded_at,response,locked_at,client_name')
    .eq('token_hash', hashToken(token)).maybeSingle()
  if (error) throw error
  if (!link) return { state: 'invalid' }
  const { data: item } = await supabaseAdmin.from('content_items').select('title').eq('id', link.content_item_id).maybeSingle()
  const state: LinkState = link.revoked_at ? 'revoked' : link.responded_at ? 'responded'
    : new Date(link.expires_at).getTime() <= Date.now() ? 'expired' : link.locked_at ? 'locked' : 'active'
  return { state, title: item?.title, link: { id: link.id, agency_id: link.agency_id, content_item_id: link.content_item_id,
    version_id: link.version_id, pin_hash: link.pin_hash, response: link.response, client_name: link.client_name } }
}

export async function hasApprovalSession(linkId: string) {
  return sessionValid(linkId, (await cookies()).get(SESSION_COOKIE)?.value)
}

export function requestMeta(headers: Headers) {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return { ip: forwarded || headers.get('x-real-ip') || 'unknown', userAgent: headers.get('user-agent') ?? 'unknown' }
}
