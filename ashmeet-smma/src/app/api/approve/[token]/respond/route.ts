import { NextResponse } from 'next/server'
import { z } from 'zod'
import { parseJsonBody } from '@/lib/api'
import { hasApprovalSession, resolveLink } from '@/lib/phase6/client-link'
import { stateResponse } from '@/lib/phase6/client-api'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { pushAfterResponse } from '@/lib/push/send'

type Context = { params: Promise<{ token: string }> }
const schema = z.object({ response: z.enum(['approved', 'changes']), text: z.string().max(4000).optional() })
const noStore = { 'Cache-Control': 'no-store' }

/** Public, needs the PIN-verified cookie. The database applies the response once; a second attempt reports "responded". */
export async function POST(request: Request, { params }: Context) {
  const { token } = await params
  const resolved = await resolveLink(token)
  if (resolved.state !== 'active' || !resolved.link) return stateResponse(resolved.state === 'active' ? 'invalid' : resolved.state)
  if (!await hasApprovalSession(resolved.link.id)) return NextResponse.json({ state: 'pin_required' }, { status: 401, headers: noStore })
  const parsed = await parseJsonBody(request, schema)
  if (!parsed.ok) return parsed.response
  if (parsed.value.response === 'changes' && !parsed.value.text?.trim())
    return NextResponse.json({ message: 'Tell us what to change.' }, { status: 400, headers: noStore })
  const { error } = await supabaseAdmin.rpc('phase6_client_respond', {
    p_link_id: resolved.link.id, p_response: parsed.value.response, p_text: parsed.value.text ?? null })
  if (error) {
    const state = ['revoked', 'responded', 'locked', 'expired', 'invalid'].find((name) => error.message.includes(name))
    if (state) return stateResponse(state as 'revoked' | 'responded' | 'locked' | 'expired' | 'invalid')
    return NextResponse.json({ message: 'Your response could not be saved. Try again.' }, { status: 500, headers: noStore })
  }
  pushAfterResponse()
  return NextResponse.json({ ok: true, response: parsed.value.response }, { headers: noStore })
}
