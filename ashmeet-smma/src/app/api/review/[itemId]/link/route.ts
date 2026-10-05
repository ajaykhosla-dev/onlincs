import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { forbidden, unauthorized } from '@/lib/api'
import { env } from '@/lib/env'
import { isReviewer, itemContext, rpcStatus } from '@/lib/phase6/review'
import { hashPin, hashToken, newPin, newToken } from '@/lib/phase6/tokens'
import { supabaseAdmin } from '@/lib/supabase/admin'

type Context = { params: Promise<{ itemId: string }> }
const noStore = { 'Cache-Control': 'no-store' }

/** Describes the active link only. The token and PIN exist nowhere after generation, so they cannot be returned. */
export async function GET(_request: Request, { params }: Context) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  if (!isReviewer(user)) return forbidden()
  const { itemId } = await params
  if (!await itemContext(user, itemId, 'read')) return forbidden()
  const { data } = await supabaseAdmin.from('approval_links')
    .select('id,version_id,expires_at,viewed_at,responded_at,response,locked_at,failed_attempts,created_at,revoked_at')
    .eq('content_item_id', itemId).order('created_at', { ascending: false }).limit(1).maybeSingle()
  const active = data && !data.revoked_at && !data.responded_at
  return NextResponse.json({
    link: data ? { id: data.id, created_at: data.created_at, expires_at: data.expires_at, viewed_at: data.viewed_at,
      response: data.response, locked: !!data.locked_at, failed_attempts: data.failed_attempts,
      expired: new Date(data.expires_at).getTime() <= Date.now(), active: !!active } : null,
  }, { headers: noStore })
}

/** Generates (or regenerates, revoking the previous link) and returns the URL and PIN exactly once. */
export async function POST(_request: Request, { params }: Context) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  if (!isReviewer(user)) return forbidden()
  const { itemId } = await params
  if (!await itemContext(user, itemId, 'write')) return forbidden()
  const token = newToken()
  const pin = newPin()
  const { data, error } = await supabaseAdmin.rpc('phase6_create_link', {
    p_item_id: itemId, p_actor_id: user.id, p_token_hash: hashToken(token), p_pin_hash: await hashPin(pin) })
  if (error) return NextResponse.json({ message: error.message }, { status: rpcStatus(error.message) })
  return NextResponse.json({ url: `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/approve/${token}`, pin, expiresAt: data.expires_at },
    { status: 201, headers: noStore })
}

export async function DELETE(_request: Request, { params }: Context) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  if (!isReviewer(user)) return forbidden()
  const { itemId } = await params
  if (!await itemContext(user, itemId, 'write')) return forbidden()
  const { error } = await supabaseAdmin.rpc('phase6_revoke_link', { p_item_id: itemId, p_actor_id: user.id })
  if (error) return NextResponse.json({ message: error.message }, { status: rpcStatus(error.message) })
  return NextResponse.json({ revoked: true })
}
