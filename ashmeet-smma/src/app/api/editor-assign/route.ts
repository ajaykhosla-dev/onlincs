import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/current-user'
import { badRequest, forbidden, parseJsonBody, unauthorized } from '@/lib/api'
import { itemContext } from '@/lib/phase6/review'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { pushAfterResponse } from '@/lib/push/send'

const bodySchema = z.object({ itemId: z.string().min(1), editorId: z.string().min(1), deadline: z.iso.date() })

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  if (!['admin','brand_manager'].includes(user.role)) return forbidden()
  const body = await parseJsonBody(request, bodySchema)
  if (!body.ok) return body.response
  // canAccess decides: an admin, or the brand manager who owns this item's client
  if (!await itemContext(user, body.value.itemId, 'write')) return forbidden()
  const { data: activeUpload } = await supabaseAdmin.from('media_upload_sessions').select('id')
    .eq('content_item_id',body.value.itemId).eq('kind','cut').in('state',['active','completing','aborting']).maybeSingle()
  if (activeUpload) return NextResponse.json({ message: 'An editor is uploading this cut. Ask them to finish or cancel before changing the assignment.' },{ status: 409 })
  const { data, error } = await supabaseAdmin.rpc('phase5_assign_editor', {
    p_item_id: body.value.itemId, p_editor_id: body.value.editorId,
    p_deadline: body.value.deadline, p_actor_id: user.id,
  })
  if (error) return badRequest(error.message)
  pushAfterResponse()
  return NextResponse.json({ item: data })
}
