import { NextResponse } from 'next/server'
import { platformApi, platformLog } from '@/lib/platform/auth'
import { inviteAdmin } from '@/lib/platform/invite'
import { supabaseAdmin } from '@/lib/supabase/admin'

type Context = { params: Promise<{ id: string }> }

/** Re-sends the invitation to the agency's admin (the first active admin on file). */
export async function POST(_request: Request, { params }: Context) {
  const guard = await platformApi()
  if ('response' in guard) return guard.response
  const { id } = await params
  const { data: admin } = await supabaseAdmin.from('users').select('id,email').eq('agency_id', id).eq('role', 'admin').eq('is_active', true).order('created_at').limit(1).maybeSingle()
  if (!admin) return NextResponse.json({ message: 'This agency has no admin to invite.' }, { status: 404 })
  try {
    const result = await inviteAdmin(admin.email)
    await platformLog(guard.user, id, 'admin_invited', admin.id, { email_sent: result.emailSent, resend: true })
    return NextResponse.json(result)
  } catch { return NextResponse.json({ message: 'Could not create the sign-in identity.' }, { status: 502 }) }
}
