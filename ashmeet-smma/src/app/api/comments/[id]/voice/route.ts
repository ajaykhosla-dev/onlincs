import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { forbidden, unauthorized } from '@/lib/api'
import { headObject, presignGet } from '@/lib/b2/presign'
import { versionContext } from '@/lib/phase6/review'
import { supabaseAdmin } from '@/lib/supabase/admin'

type Context = { params: Promise<{ id: string }> }

/** Presigned, short-lived playback URL for one voice note. */
export async function GET(_request: Request, { params }: Context) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  const { id } = await params
  const { data: comment } = await supabaseAdmin.from('comments').select('version_id,voice_note_key').eq('id', id).maybeSingle()
  if (!comment?.voice_note_key || !await versionContext(user, comment.version_id, 'read')) return forbidden()
  try {
    await headObject(comment.voice_note_key)
    return NextResponse.json({ url: await presignGet(comment.voice_note_key, 5 * 60) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const missing = error instanceof Error && ['NotFound', 'NoSuchKey'].includes(error.name)
    return NextResponse.json({ message: missing ? 'This voice note file is not available.' : 'Could not open the voice note right now.' },
      { status: missing ? 404 : 502 })
  }
}
