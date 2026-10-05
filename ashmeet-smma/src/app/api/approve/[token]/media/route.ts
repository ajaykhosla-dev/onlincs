import { NextResponse } from 'next/server'
import { hasFaststart, headObject, presignGet } from '@/lib/b2/presign'
import { hasApprovalSession, resolveLink } from '@/lib/phase6/client-link'
import { stateResponse } from '@/lib/phase6/client-api'
import { supabaseAdmin } from '@/lib/supabase/admin'

type Context = { params: Promise<{ token: string }> }

/** Public, but needs the PIN-verified cookie. Returns a short-lived URL for the one cut this link covers. */
export async function GET(_request: Request, { params }: Context) {
  const { token } = await params
  const resolved = await resolveLink(token)
  if (resolved.state !== 'active' || !resolved.link) return stateResponse(resolved.state === 'active' ? 'invalid' : resolved.state)
  if (!await hasApprovalSession(resolved.link.id)) return NextResponse.json({ state: 'pin_required' }, { status: 401 })
  const { data: version } = await supabaseAdmin.from('deliverable_versions').select('b2_key').eq('id', resolved.link.version_id).maybeSingle()
  if (!version) return stateResponse('invalid')
  try {
    await headObject(version.b2_key)
    const faststart = await hasFaststart(version.b2_key).catch(() => null)
    return NextResponse.json({ url: await presignGet(version.b2_key, 30 * 60), faststart }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ message: 'The video could not be loaded right now.' }, { status: 502 })
  }
}
