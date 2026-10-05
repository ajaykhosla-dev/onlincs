import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { forbidden, parseJsonBody, unauthorized } from '@/lib/api'
import { postAccess, rpcStatus } from '@/lib/phase7/access'
import { postedSchema } from '@/lib/phase7/schemas'
import { supabaseAdmin } from '@/lib/supabase/admin'

type Context = { params: Promise<{ id: string }> }

/** `{ posted: true }` marks it posted (any date, so catching up is fine); `{ posted: false }` undoes it within 24 hours. */
export async function POST(request: Request, { params }: Context) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  const { id } = await params
  if (!await postAccess(user, id, 'write')) return forbidden()
  const body = await parseJsonBody(request, postedSchema)
  if (!body.ok) return body.response
  const { data, error } = await supabaseAdmin.rpc(body.value.posted ? 'phase7_mark_posted' : 'phase7_unmark_posted',
    { p_post_id: id, p_actor_id: user.id })
  if (error) return NextResponse.json({ message: error.message }, { status: rpcStatus(error.message) })
  return NextResponse.json({ post: data })
}
