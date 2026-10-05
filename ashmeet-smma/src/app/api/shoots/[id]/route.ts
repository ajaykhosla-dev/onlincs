import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { badRequest, forbidden, parseJsonBody, unauthorized } from '@/lib/api'
import { shootFor } from '@/lib/phase4/data'
import { shootEditBody } from '@/lib/phase4/schemas'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { pushAfterResponse } from '@/lib/push/send'

type Context = { params: Promise<{ id: string }> }
export async function GET(_request: Request,{ params }: Context) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  const shoot = await shootFor(user,(await params).id)
  return shoot ? NextResponse.json(shoot) : forbidden()
}
export async function PATCH(request: Request,{ params }: Context) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  if (!['admin','brand_manager'].includes(user.role)) return forbidden()
  const id = (await params).id
  if (!await shootFor(user,id)) return forbidden()
  const body = await parseJsonBody(request,shootEditBody)
  if (!body.ok) return body.response
  const { data,error } = await supabaseAdmin.rpc('phase4_update_shoot',{ p_shoot_id:id,p_data:body.value,p_actor_id:user.id })
  if (!error) pushAfterResponse()
  return error ? badRequest(error.message) : NextResponse.json(data)
}
export async function DELETE(_request: Request,{ params }: Context) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  if (!['admin','brand_manager'].includes(user.role)) return forbidden()
  const id = (await params).id
  if (!await shootFor(user,id)) return forbidden()
  const { data,error } = await supabaseAdmin.rpc('phase4_cancel_shoot',{ p_shoot_id:id,p_actor_id:user.id })
  return error ? badRequest(error.message) : NextResponse.json(data)
}
