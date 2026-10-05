import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/current-user'
import { badRequest, forbidden, parseJsonBody, unauthorized } from '@/lib/api'
import { shootFor } from '@/lib/phase4/data'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { pushAfterResponse } from '@/lib/push/send'

type Context={params:Promise<{id:string}>}
export async function POST(request:Request,{params}:Context) {
  const user=await getCurrentUser()
  if(!user)return unauthorized()
  if(!['admin','brand_manager'].includes(user.role))return forbidden()
  const id=(await params).id
  if(!await shootFor(user,id))return forbidden()
  const body=await parseJsonBody(request,z.object({content_item_id:z.string().min(1)}))
  if(!body.ok)return body.response
  const {data,error}=await supabaseAdmin.rpc('phase4_add_shoot_item',{p_shoot_id:id,p_item_id:body.value.content_item_id,p_actor_id:user.id})
  if(!error)pushAfterResponse()
  return error?badRequest(error.message):NextResponse.json(data)
}
