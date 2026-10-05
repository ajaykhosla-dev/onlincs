import { NextResponse } from 'next/server'
import { z } from 'zod'
import { parseJsonBody } from '@/lib/api'
import { resolveLink } from '@/lib/phase6/client-link'
import { stateResponse } from '@/lib/phase6/client-api'
import { issueSession, SESSION_COOKIE, SESSION_SECONDS, verifyPin } from '@/lib/phase6/tokens'
import { supabaseAdmin } from '@/lib/supabase/admin'

type Context = { params: Promise<{ token: string }> }
const schema = z.object({ pin: z.string().regex(/^\d{4}$/, 'Enter the 4-digit PIN') })
const noStore = { 'Cache-Control': 'no-store' }

/** Public. Every attempt is recorded by the database; the fifth failure locks the link until it is regenerated. */
export async function POST(request: Request, { params }: Context) {
  const { token } = await params
  const resolved = await resolveLink(token)
  if (resolved.state !== 'active' || !resolved.link) return stateResponse(resolved.state === 'active' ? 'invalid' : resolved.state)
  const parsed = await parseJsonBody(request, schema)
  if (!parsed.ok) return parsed.response
  const correct = await verifyPin(parsed.value.pin, resolved.link.pin_hash)
  const { data, error } = await supabaseAdmin.rpc('phase6_pin_attempt', { p_link_id: resolved.link.id, p_ok: correct })
  if (error) return NextResponse.json({ message: 'Something went wrong. Try again.' }, { status: 500, headers: noStore })
  // A correct guess that lands after the lock (concurrent attempts) is still refused.
  if (data.locked) return stateResponse('locked')
  if (!correct) return NextResponse.json({ message: 'That PIN is not right.', remaining: data.remaining }, { status: 401, headers: noStore })
  const response = NextResponse.json({ ok: true }, { headers: noStore })
  response.cookies.set(SESSION_COOKIE, issueSession(resolved.link.id), {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: SESSION_SECONDS })
  return response
}
