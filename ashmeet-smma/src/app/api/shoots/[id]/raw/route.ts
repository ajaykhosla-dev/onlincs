import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/current-user'
import { badRequest, forbidden, parseJsonBody, unauthorized } from '@/lib/api'
import { shootFor } from '@/lib/phase4/data'
import { supabaseAdmin } from '@/lib/supabase/admin'

type Context={params:Promise<{id:string}>}
export async function POST(request:Request,{params}:Context) {
  const user=await getCurrentUser()
  if(!user)return unauthorized()
  if(!['admin','brand_manager','cameraman'].includes(user.role))return forbidden()
  const id=(await params).id
  const shoot=await shootFor(user,id)
  if(!shoot)return forbidden()
  const body=await parseJsonBody(request,z.object({content_item_id:z.string().min(1)}))
  if(!body.ok)return body.response
  if(!shoot.ideas.some((idea)=>idea.content_item_id===body.value.content_item_id))return forbidden()
  const {data,error}=await supabaseAdmin.rpc('phase4_mark_raw',{p_shoot_id:id,p_item_id:body.value.content_item_id,p_actor_id:user.id})
  return error?badRequest(error.message):NextResponse.json(data)
}
