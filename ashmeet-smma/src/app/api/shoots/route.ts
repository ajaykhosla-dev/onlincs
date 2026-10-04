import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { badRequest, forbidden, parseJsonBody, unauthorized } from '@/lib/api'
import { getClientFor } from '@/lib/phase3/data'
import { shootsFor } from '@/lib/phase4/data'
import { shootBody } from '@/lib/phase4/schemas'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { env } from '@/lib/env'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  if (!['admin','brand_manager','cameraman','editor'].includes(user.role)) return forbidden()
  try { return NextResponse.json({ shoots: await shootsFor(user) }) }
  catch { return NextResponse.json({ message: 'Could not load shoots' }, { status: 500 }) }
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  if (!['admin','brand_manager'].includes(user.role)) return forbidden()
  const body = await parseJsonBody(request, shootBody)
  if (!body.ok) return body.response
  if (!await getClientFor(user, body.value.client_id, 'write')) return forbidden()
  const { data: driveState } = await supabaseAdmin.from('drive_sync_state').select('shared_drive_id').eq('agency_id', user.agency_id).maybeSingle()
  if (driveState?.shared_drive_id !== env.GOOGLE_SHARED_DRIVE_ID)
    return NextResponse.json({ message: 'This workspace has no configured Shared Drive' }, { status: 503 })
  const { content_item_ids, ...data } = body.value
  const { data: shoot, error } = await supabaseAdmin.rpc('phase4_create_shoot', {
    p_data: data, p_item_ids: [...new Set(content_item_ids)], p_actor_id: user.id,
  })
  if (error) return badRequest(error.message)
  return NextResponse.json(shoot, { status: 201 })
}
