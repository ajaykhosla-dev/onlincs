import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/current-user'
import { forbidden, parseJsonBody, unauthorized } from '@/lib/api'
import { deleteObject } from '@/lib/b2/presign'
import { COMMENT_COLUMNS, toReviewComment, versionContext } from '@/lib/phase6/review'
import { supabaseAdmin } from '@/lib/supabase/admin'

type Context = { params: Promise<{ id: string }> }
const schema = z.object({ body: z.string().trim().min(1).max(2000).optional(), resolved: z.boolean().optional() })
  .refine((value) => value.body !== undefined || value.resolved !== undefined, { message: 'Nothing to change' })

async function loadComment(id: string) {
  const { data } = await supabaseAdmin.from('comments').select('id,version_id,author_id,source,voice_note_key').eq('id', id).maybeSingle()
  return data
}

/** Edit is author-only; anyone who can work on the cut (reviewer or its assigned editor) may mark it resolved. */
export async function PATCH(request: Request, { params }: Context) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  const { id } = await params
  const comment = await loadComment(id)
  if (!comment || !await versionContext(user, comment.version_id, 'read')) return forbidden()
  const parsed = await parseJsonBody(request, schema)
  if (!parsed.ok) return parsed.response
  const update: Record<string, unknown> = {}
  if (parsed.value.body !== undefined) {
    if (comment.author_id !== user.id || comment.source !== 'internal') return forbidden()
    update.body = parsed.value.body
    update.edited_at = new Date().toISOString()
  }
  if (parsed.value.resolved !== undefined) update.resolved_at = parsed.value.resolved ? new Date().toISOString() : null
  const { data, error } = await supabaseAdmin.from('comments').update(update).eq('id', id).select(COMMENT_COLUMNS).single()
  if (error) return NextResponse.json({ message: 'Could not update the comment' }, { status: 500 })
  return NextResponse.json({ comment: toReviewComment(data) })
}

export async function DELETE(_request: Request, { params }: Context) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  const { id } = await params
  const comment = await loadComment(id)
  if (!comment || !await versionContext(user, comment.version_id, 'read')) return forbidden()
  if (comment.author_id !== user.id || comment.source !== 'internal') return forbidden()
  const { error } = await supabaseAdmin.from('comments').delete().eq('id', id)
  if (error) return NextResponse.json({ message: 'Could not delete the comment' }, { status: 500 })
  if (comment.voice_note_key) await deleteObject(comment.voice_note_key).catch(() => {})
  return NextResponse.json({ deleted: true })
}
