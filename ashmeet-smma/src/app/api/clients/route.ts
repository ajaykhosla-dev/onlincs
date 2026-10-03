import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { badRequest, forbidden, parseJsonBody, unauthorized } from '@/lib/api'
import { clientDashboard } from '@/lib/phase3/data'
import { clientSchema, monthSchema } from '@/lib/phase3/schemas'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  if (!['admin', 'brand_manager'].includes(user.role)) return forbidden()
  const month = new URL(request.url).searchParams.get('month') ?? new Date().toISOString().slice(0, 7)
  if (!monthSchema.safeParse(month).success) return badRequest('Invalid month')
  try { return NextResponse.json(await clientDashboard(user, month)) }
  catch { return NextResponse.json({ message: 'Could not load clients' }, { status: 500 }) }
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  if (user.role !== 'admin') return forbidden()
  const body = await parseJsonBody(request, clientSchema.extend({ scope: clientSchema.shape.scope.unwrap() }))
  if (!body.ok) return body.response
  const { scope, ...data } = body.value
  const { data: client, error } = await supabaseAdmin.rpc('phase3_save_client', { p_id: null, p_data: data, p_scope: scope, p_actor_id: user.id })
  if (error) return badRequest(error.message)
  return NextResponse.json(client, { status: 201 })
}
