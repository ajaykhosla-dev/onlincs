import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { forbidden, unauthorized } from '@/lib/api'
import { isReviewer, versionContext } from '@/lib/phase6/review'
import { transcribeComment } from '@/lib/phase6/transcribe'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const maxDuration = 60
type Context = { params: Promise<{ id: string }> }

/** Starts or retries transcription. A failure leaves the comment and its audio untouched. */
export async function POST(_request: Request, { params }: Context) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  if (!isReviewer(user)) return forbidden()
  const { id } = await params
  const { data: comment } = await supabaseAdmin.from('comments').select('version_id,voice_note_key,transcript_status').eq('id', id).maybeSingle()
  if (!comment?.voice_note_key || !await versionContext(user, comment.version_id, 'write')) return forbidden()
  if (comment.transcript_status === 'done') return NextResponse.json({ status: 'done' })
  const status = await transcribeComment(id)
  const { data } = await supabaseAdmin.from('comments').select('transcript,transcript_status').eq('id', id).maybeSingle()
  return NextResponse.json({ status, transcript: data?.transcript ?? null, transcript_status: data?.transcript_status ?? status })
}
