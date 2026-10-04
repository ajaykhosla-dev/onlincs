import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/current-user'
import { badRequest, forbidden, parseJsonBody, unauthorized } from '@/lib/api'
import { supabaseAdmin } from '@/lib/supabase/admin'

const bodySchema = z.object({ itemId: z.string().min(1), editorId: z.string().min(1), deadline: z.iso.date() })

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  if (!['admin','brand_manager'].includes(user.role)) return forbidden()
  const body = await parseJsonBody(request, bodySchema)
  if (!body.ok) return body.response
  const { data: item } = await supabaseAdmin.from('content_items').select('agency_id,client_id').eq('id',body.value.itemId).maybeSingle()
  if (!item || item.agency_id !== user.agency_id) return forbidden()
  if (user.role === 'brand_manager') {
    const { data: client } = await supabaseAdmin.from('clients').select('manager_id').eq('id',item.client_id).maybeSingle()
    if (client?.manager_id !== user.id) return forbidden()
  }
  const { data: activeUpload } = await supabaseAdmin.from('media_upload_sessions').select('id')
    .eq('content_item_id',body.value.itemId).eq('kind','cut').in('state',['active','completing','aborting']).maybeSingle()
  if (activeUpload) return NextResponse.json({ message: 'An editor is uploading this cut. Ask them to finish or cancel before changing the assignment.' },{ status: 409 })
  const { data, error } = await supabaseAdmin.rpc('phase5_assign_editor', {
    p_item_id: body.value.itemId, p_editor_id: body.value.editorId,
    p_deadline: body.value.deadline, p_actor_id: user.id,
  })
  if (error) return badRequest(error.message)
  return NextResponse.json({ item: data })
}
