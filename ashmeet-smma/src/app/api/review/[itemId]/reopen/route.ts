import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/current-user'
import { forbidden, parseJsonBody, unauthorized } from '@/lib/api'
import { isReviewer, itemContext, rpcStatus } from '@/lib/phase6/review'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { pushAfterResponse } from '@/lib/push/send'

type Context = { params: Promise<{ itemId: string }> }
const schema = z.object({ note: z.string().trim().min(1, 'Describe the change that is needed').max(4000) })

/** A client-approved item can still re-enter the revision loop, e.g. when the client asks for a change later. */
export async function POST(request: Request, { params }: Context) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  if (!isReviewer(user)) return forbidden()
  const { itemId } = await params
  if (!await itemContext(user, itemId, 'write')) return forbidden()
  const parsed = await parseJsonBody(request, schema)
  if (!parsed.ok) return parsed.response
  const { data, error } = await supabaseAdmin.rpc('phase6_reopen_item', {
    p_item_id: itemId, p_actor_id: user.id, p_note: parsed.value.note })
  if (error) return NextResponse.json({ message: error.message }, { status: rpcStatus(error.message) })
  pushAfterResponse()
  return NextResponse.json({ item: data })
}
