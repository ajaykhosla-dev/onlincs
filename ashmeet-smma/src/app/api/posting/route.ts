import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { badRequest, forbidden, parseJsonBody, unauthorized } from '@/lib/api'
import { isReviewer } from '@/lib/phase6/review'
import { monthSchema } from '@/lib/phase3/schemas'
import { itemAccess, rpcStatus } from '@/lib/phase7/access'
import { postingData } from '@/lib/phase7/data'
import { istDate } from '@/lib/phase7/format'
import { scheduleSchema } from '@/lib/phase7/schemas'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  if (!isReviewer(user)) return forbidden()
  const month = new URL(request.url).searchParams.get('month') ?? istDate(new Date()).slice(0, 7)
  if (!monthSchema.safeParse(month).success) return badRequest('Invalid month')
  try { return NextResponse.json(await postingData(user, month), { headers: { 'Cache-Control': 'no-store' } }) }
  catch { return NextResponse.json({ message: 'Could not load the posting schedule' }, { status: 500 }) }
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  if (!isReviewer(user)) return forbidden()
  const body = await parseJsonBody(request, scheduleSchema)
  if (!body.ok) return body.response
  if (!await itemAccess(user, body.value.itemId, 'write')) return forbidden()
  const { data, error } = await supabaseAdmin.rpc('phase7_schedule_post', { p_item_id: body.value.itemId, p_actor_id: user.id,
    p_scheduled_at: body.value.scheduledAt, p_caption: body.value.caption, p_music: body.value.music })
  if (error) return NextResponse.json({ message: error.message }, { status: rpcStatus(error.message) })
  return NextResponse.json({ post: data }, { status: 201 })
}
