import { NextResponse } from 'next/server'
import { z } from 'zod'
import { parseJsonBody } from '@/lib/api'
import { agencyUsage, getAgency } from '@/lib/platform/agencies'
import { platformApi, platformLog } from '@/lib/platform/auth'
import { integrationSummary } from '@/lib/platform/integrations'
import { supabaseAdmin } from '@/lib/supabase/admin'

type Context = { params: Promise<{ id: string }> }
const patchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(), display_name: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(), address: z.string().trim().max(300).optional(),
  services: z.string().trim().max(500).optional(), notes: z.string().trim().max(2000).optional(),
  plan: z.enum(['trial', 'standard', 'pro']).optional(),
  logo_url: z.union([z.literal(''), z.url().max(500).refine((value) => value.startsWith('https://'), 'The logo must be an https:// image link')]).optional(),
})

export async function GET(_request: Request, { params }: Context) {
  const guard = await platformApi()
  if ('response' in guard) return guard.response
  const { id } = await params
  const agency = await getAgency(id)
  if (!agency) return NextResponse.json({ message: 'Agency not found' }, { status: 404 })
  return NextResponse.json({ agency, usage: await agencyUsage(id), integrations: await integrationSummary(id) }, { headers: { 'Cache-Control': 'no-store' } })
}

/** Details, display name and logo: light white-labelling that shows only inside that agency's product. */
export async function PATCH(request: Request, { params }: Context) {
  const guard = await platformApi()
  if ('response' in guard) return guard.response
  const { id } = await params
  if (!await getAgency(id)) return NextResponse.json({ message: 'Agency not found' }, { status: 404 })
  const parsed = await parseJsonBody(request, patchSchema)
  if (!parsed.ok) return parsed.response
  const update = Object.fromEntries(Object.entries(parsed.value).filter(([, value]) => value !== undefined).map(([key, value]) => [key, key === 'logo_url' && value === '' ? null : value]))
  if (!Object.keys(update).length) return NextResponse.json({ message: 'Nothing to change' }, { status: 400 })
  const { error } = await supabaseAdmin.from('agencies').update(update).eq('id', id)
  if (error) return NextResponse.json({ message: 'Could not save the changes' }, { status: 500 })
  await platformLog(guard.user, id, 'agency_updated', id, { fields: Object.keys(update) })
  return NextResponse.json({ agency: await getAgency(id) })
}
