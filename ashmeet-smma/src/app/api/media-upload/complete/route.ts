import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/current-user'
import { badRequest, forbidden, parseJsonBody, unauthorized } from '@/lib/api'
import { completeMultipart, listParts } from '@/lib/b2/presign'
import { canUploadCut, canUploadLibrary, getUploadSession, PART_SIZE, uploadedObjectMatches } from '@/lib/phase5/upload'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { pushAfterResponse } from '@/lib/push/send'

const schema = z.object({ sessionId: z.uuid(),
  durationSeconds: z.number().int().min(0).max(7200).nullable().optional(), assetKind: z.enum(['video','image','audio','document']).optional() })

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  const body = await parseJsonBody(request,schema)
  if (!body.ok) return body.response
  const session = await getUploadSession(user,body.value.sessionId)
  if (!session || session.state === 'aborted' || session.state === 'aborting') return forbidden()
  if (session.state === 'completed') return NextResponse.json({ id: session.result_id, completed: true })
  const allowed = session.kind === 'cut'
    ? await canUploadCut(user,session.content_item_id!) : await canUploadLibrary(user,session.client_id!)
  if (!allowed) return forbidden()
  if (session.kind === 'library' && !body.value.assetKind) return badRequest('Asset kind required')
  try {
    let parts: { PartNumber: number; ETag: string }[] = []
    if (!await uploadedObjectMatches(session)) {
      const listed = await listParts(session.b2_key,session.b2_upload_id)
      const listedParts = (listed.Parts ?? []).map((part) => ({ PartNumber: part.PartNumber!, ETag: part.ETag!, Size: part.Size ?? 0 }))
      const expected = Math.ceil(session.file_size_bytes/PART_SIZE)
      if (listedParts.length !== expected || listedParts.some((part,i) => part.PartNumber !== i+1)
        || listedParts.reduce((total,part) => total+part.Size,0) !== session.file_size_bytes)
        return badRequest('Upload parts are incomplete or out of order')
      parts = listedParts.map(({PartNumber,ETag}) => ({PartNumber,ETag}))
    }
    if (session.state === 'active') {
      const { data: claimed, error: claimError } = await supabaseAdmin.from('media_upload_sessions')
        .update({ state:'completing',updated_at:new Date().toISOString() }).eq('id',session.id).eq('state','active').select('id').maybeSingle()
      if (claimError) throw claimError
      if (!claimed) return NextResponse.json({ message:'Upload state changed; refresh and retry' },{ status:409 })
    }
    if (parts.length) await completeMultipart(session.b2_key,session.b2_upload_id,parts)
    if (!await uploadedObjectMatches(session)) return NextResponse.json({ message: 'Uploaded object size did not match' },{ status: 502 })
    const { data, error } = session.kind === 'cut'
      ? await supabaseAdmin.rpc('phase5_complete_cut',{ p_session_id: session.id, p_actor_id: user.id, p_duration_seconds: body.value.durationSeconds ?? null })
      : await supabaseAdmin.rpc('phase5_complete_library',{ p_session_id: session.id, p_actor_id: user.id, p_asset_kind: body.value.assetKind })
    if (error) return badRequest(error.message)
    pushAfterResponse()
    return NextResponse.json({ result: data, completed: true })
  } catch { return NextResponse.json({ message: 'Could not complete B2 upload; retry completion' },{ status: 502 }) }
}
