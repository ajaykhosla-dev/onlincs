import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { badRequest, forbidden, parseJsonBody, unauthorized } from '@/lib/api'
import { getClientFor } from '@/lib/phase3/data'
import { monthSchema, planStatusSchema } from '@/lib/phase3/schemas'
import { supabaseAdmin } from '@/lib/supabase/admin'

type Context = { params: Promise<{ id: string }> }
export async function PATCH(request: Request, { params }: Context) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  const id = (await params).id
  if (!await getClientFor(user, id, 'write')) return forbidden()
  const month = new URL(request.url).searchParams.get('month')
  if (!month || !monthSchema.safeParse(month).success) return badRequest('Invalid month')
  const body = await parseJsonBody(request, planStatusSchema)
  if (!body.ok) return body.response
  const { data, error } = await supabaseAdmin.rpc('phase3_set_plan_status', { p_client_id: id, p_month: `${month}-01`, p_status: body.value.status, p_actor_id: user.id })
  if (error) return badRequest(error.message)
  return NextResponse.json(data)
}
