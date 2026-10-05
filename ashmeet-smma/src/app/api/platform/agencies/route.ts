import { NextResponse } from 'next/server'
import { z } from 'zod'
import { parseJsonBody } from '@/lib/api'
import { listAgencies } from '@/lib/platform/agencies'
import { platformApi, platformLog } from '@/lib/platform/auth'
import { inviteAdmin } from '@/lib/platform/invite'
import { supabaseAdmin } from '@/lib/supabase/admin'

const slugify = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
const schema = z.object({
  name: z.string().trim().min(2).max(120), slug: z.string().trim().max(60).optional(),
  plan: z.enum(['trial', 'standard', 'pro']).default('standard'),
  phone: z.string().trim().max(40).default(''), address: z.string().trim().max(300).default(''),
  services: z.string().trim().max(500).default(''), notes: z.string().trim().max(2000).default(''),
  adminEmail: z.email().max(200), adminName: z.string().trim().min(2).max(120),
})

export async function GET() {
  const guard = await platformApi()
  if ('response' in guard) return guard.response
  try { return NextResponse.json({ agencies: await listAgencies() }, { headers: { 'Cache-Control': 'no-store' } }) }
  catch { return NextResponse.json({ message: 'Could not load agencies' }, { status: 500 }) }
}

/** Creates the agency row, an empty integrations row and the admin's user record in one transaction, then invites the admin. */
export async function POST(request: Request) {
  const guard = await platformApi()
  if ('response' in guard) return guard.response
  const parsed = await parseJsonBody(request, schema)
  if (!parsed.ok) return parsed.response
  const v = parsed.value
  const slug = v.slug ? slugify(v.slug) : slugify(v.name)
  const { data, error } = await supabaseAdmin.rpc('phase11_create_agency', { p_actor: guard.user.id, p_name: v.name, p_slug: slug, p_plan: v.plan,
    p_phone: v.phone, p_address: v.address, p_services: v.services, p_notes: v.notes, p_admin_email: v.adminEmail, p_admin_name: v.adminName })
  if (error) return NextResponse.json({ message: error.message }, { status: error.message === 'Forbidden' ? 403 : 409 })
  let invite: Awaited<ReturnType<typeof inviteAdmin>> | { error: string }
  try { invite = await inviteAdmin(v.adminEmail) } catch { invite = { error: 'The sign-in identity could not be created. Use "Resend invite" on the agency page.' } }
  await platformLog(guard.user, data.agency_id, 'admin_invited', data.user_id, { email_sent: 'emailSent' in invite ? invite.emailSent : false })
  return NextResponse.json({ agency_id: data.agency_id, user_id: data.user_id, invite }, { status: 201 })
}
