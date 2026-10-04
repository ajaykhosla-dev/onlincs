import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/current-user'
import { forbidden, parseJsonBody, unauthorized } from '@/lib/api'
import { abortMultipart, deleteObject } from '@/lib/b2/presign'
import { getUploadSession, uploadedObjectMatches } from '@/lib/phase5/upload'
import { supabaseAdmin } from '@/lib/supabase/admin'

const schema = z.object({ sessionId: z.uuid() })

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  const body = await parseJsonBody(request,schema)
  if (!body.ok) return body.response
  const session = await getUploadSession(user,body.value.sessionId)
  if (!session || session.state === 'completed' || session.state === 'completing') return forbidden()
  if (session.state === 'aborted') return NextResponse.json({ aborted: true })
  try {
    if (session.state === 'active') {
      const { data: claimed, error: claimError } = await supabaseAdmin.from('media_upload_sessions')
        .update({ state:'aborting',updated_at:new Date().toISOString() }).eq('id',session.id).eq('state','active').select('id').maybeSingle()
      if (claimError) throw claimError
      if (!claimed) return NextResponse.json({ message:'Upload state changed; refresh and retry' },{ status:409 })
    }
    if (await uploadedObjectMatches(session)) await deleteObject(session.b2_key)
    else {
      try { await abortMultipart(session.b2_key,session.b2_upload_id) }
      catch (error) { if (!(error instanceof Error) || error.name !== 'NoSuchUpload') throw error }
    }
    const { error } = await supabaseAdmin.from('media_upload_sessions').update({ state: 'aborted',updated_at: new Date().toISOString() })
      .eq('id',session.id).eq('state','aborting')
    if (error) throw error
    return NextResponse.json({ aborted: true })
  } catch { return NextResponse.json({ message: 'Could not abort upload; retry' },{ status: 502 }) }
}
