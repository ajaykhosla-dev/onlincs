import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { badRequest, forbidden, parseJsonBody, unauthorized } from '@/lib/api'
import { getClientFor } from '@/lib/phase3/data'
import { contentSchema } from '@/lib/phase3/schemas'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { transition, TransitionError } from '@/lib/pipeline/transitions'

type Context = { params: Promise<{ id: string; itemId: string }> }
export async function PATCH(request: Request, { params }: Context) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  const { id, itemId } = await params
  if (!await getClientFor(user, id, 'write')) return forbidden()
  const body = await parseJsonBody(request, contentSchema)
  if (!body.ok) return body.response
  const { data, error } = await supabaseAdmin.rpc('phase3_save_content', { p_id: itemId, p_client_id: id, p_data: body.value, p_actor_id: user.id })
  if (error) return badRequest(error.message)
  return NextResponse.json(data)
}
export async function DELETE(_request: Request, { params }: Context) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  const { id, itemId } = await params
  if (!await getClientFor(user, id, 'write')) return forbidden()
  try { return NextResponse.json(await transition(itemId, 'archived', user, id)) }
  catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : 'Could not archive item' }, { status: error instanceof TransitionError ? error.statusCode : 500 }) }
}
