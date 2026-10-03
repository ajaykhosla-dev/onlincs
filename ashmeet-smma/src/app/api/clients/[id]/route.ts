import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { badRequest, forbidden, parseJsonBody, unauthorized } from '@/lib/api'
import { getClientFor } from '@/lib/phase3/data'
import { clientSchema } from '@/lib/phase3/schemas'
import { supabaseAdmin } from '@/lib/supabase/admin'

type Context = { params: Promise<{ id: string }> }
export async function GET(_request: Request, { params }: Context) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  const client = await getClientFor(user, (await params).id, 'read')
  return client ? NextResponse.json(client) : forbidden()
}
export async function PATCH(request: Request, { params }: Context) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  const id = (await params).id
  if (!await getClientFor(user, id, 'write')) return forbidden()
  const body = await parseJsonBody(request, clientSchema)
  if (!body.ok) return body.response
  const data = { code: body.value.code, name: body.value.name, handle: body.value.handle,
    niche: body.value.niche, manager_id: body.value.manager_id, status: body.value.status }
  const { data: client, error } = await supabaseAdmin.rpc('phase3_save_client', { p_id: id, p_data: data, p_scope: {}, p_actor_id: user.id })
  if (error) return badRequest(error.message)
  return NextResponse.json(client)
}
