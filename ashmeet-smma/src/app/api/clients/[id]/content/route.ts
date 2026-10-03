import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { badRequest, forbidden, parseJsonBody, unauthorized } from '@/lib/api'
import { getClientFor, plannerData } from '@/lib/phase3/data'
import { contentSchema, monthSchema } from '@/lib/phase3/schemas'
import { supabaseAdmin } from '@/lib/supabase/admin'

type Context = { params: Promise<{ id: string }> }
export async function GET(request: Request, { params }: Context) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  const month = new URL(request.url).searchParams.get('month') ?? new Date().toISOString().slice(0, 7)
  if (!monthSchema.safeParse(month).success) return badRequest('Invalid month')
  try {
    const result = await plannerData(user, (await params).id, month)
    return result ? NextResponse.json(result) : forbidden()
  } catch { return NextResponse.json({ message: 'Could not load content' }, { status: 500 }) }
}
export async function POST(request: Request, { params }: Context) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  const id = (await params).id
  if (!await getClientFor(user, id, 'write')) return forbidden()
  const body = await parseJsonBody(request, contentSchema)
  if (!body.ok) return body.response
  const { data, error } = await supabaseAdmin.rpc('phase3_save_content', { p_id: null, p_client_id: id, p_data: body.value, p_actor_id: user.id })
  if (error) return badRequest(error.message)
  return NextResponse.json(data, { status: 201 })
}
