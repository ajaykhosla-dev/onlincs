import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { forbidden, unauthorized } from '@/lib/api'
import { shootFor } from '@/lib/phase4/data'
import { provisionShoot } from '@/lib/phase4/provision'

type Context={params:Promise<{id:string}>}
export async function POST(_request:Request,{params}:Context) {
  const user=await getCurrentUser()
  if(!user)return unauthorized()
  if(!['admin','brand_manager'].includes(user.role))return forbidden()
  const id=(await params).id
  if(!await shootFor(user,id))return forbidden()
  const result=await provisionShoot(id)
  return NextResponse.json(result,{status:result.status==='failed'?502:200})
}
