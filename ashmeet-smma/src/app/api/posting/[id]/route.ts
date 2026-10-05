import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { forbidden, parseJsonBody, unauthorized } from '@/lib/api'
import { postAccess, rpcStatus } from '@/lib/phase7/access'
import { editSchema } from '@/lib/phase7/schemas'
import { supabaseAdmin } from '@/lib/supabase/admin'

type Context = { params: Promise<{ id: string }> }

/** Edit the time, caption or music of a post that has not gone out yet. */
export async function PATCH(request: Request, { params }: Context) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  const { id } = await params
  if (!await postAccess(user, id, 'write')) return forbidden()
  const body = await parseJsonBody(request, editSchema)
  if (!body.ok) return body.response
  const { data, error } = await supabaseAdmin.rpc('phase7_update_post', { p_post_id: id, p_actor_id: user.id,
    p_scheduled_at: body.value.scheduledAt, p_caption: body.value.caption, p_music: body.value.music })
  if (error) return NextResponse.json({ message: error.message }, { status: rpcStatus(error.message) })
  return NextResponse.json({ post: data })
}
