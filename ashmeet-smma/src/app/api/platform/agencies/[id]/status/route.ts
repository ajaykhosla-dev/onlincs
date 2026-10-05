import { NextResponse } from 'next/server'
import { z } from 'zod'
import { parseJsonBody } from '@/lib/api'
import { platformApi } from '@/lib/platform/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

type Context = { params: Promise<{ id: string }> }
const schema = z.object({ status: z.enum(['active', 'suspended', 'trial']), reason: z.string().trim().max(500).optional() })

/** Suspend or reactivate. Suspending blocks every user of that agency from signing in and deletes nothing. */
export async function POST(request: Request, { params }: Context) {
  const guard = await platformApi()
  if ('response' in guard) return guard.response
  const { id } = await params
  const parsed = await parseJsonBody(request, schema)
  if (!parsed.ok) return parsed.response
  const { data, error } = await supabaseAdmin.rpc('phase11_set_agency_status', { p_actor: guard.user.id, p_agency: id, p_status: parsed.value.status, p_reason: parsed.value.reason ?? null })
  if (error) return NextResponse.json({ message: error.message }, { status: error.message === 'Forbidden' ? 403 : /not found/i.test(error.message) ? 404 : 409 })
  return NextResponse.json(data)
}
