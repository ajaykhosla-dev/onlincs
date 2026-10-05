import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/current-user'
import { badRequest, forbidden, parseJsonBody, unauthorized } from '@/lib/api'
import { headObject } from '@/lib/b2/presign'
import { voiceNoteKey } from '@/lib/b2/keys'
import { COMMENT_COLUMNS, isReviewer, toReviewComment, versionContext } from '@/lib/phase6/review'
import { supabaseAdmin } from '@/lib/supabase/admin'

type Context = { params: Promise<{ id: string }> }
const MAX_VOICE_BYTES = 8 * 1024 * 1024

const schema = z.object({
  body: z.string().trim().max(2000).default(''),
  timestampStart: z.number().min(0).max(86400).nullable().optional(),
  timestampEnd: z.number().min(0).max(86400).nullable().optional(),
  voice: z.object({ commentId: z.uuid(), ext: z.enum(['webm', 'mp4']) }).optional(),
}).refine((value) => value.body.length > 0 || value.voice, { message: 'Write a comment or record a voice note', path: ['body'] })
  .refine((value) => value.timestampEnd == null || (value.timestampStart != null && value.timestampEnd > value.timestampStart),
    { message: 'The range must end after it starts', path: ['timestampEnd'] })

export async function GET(_request: Request, { params }: Context) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  const { id } = await params
  if (!await versionContext(user, id, 'read')) return forbidden()
  const { data, error } = await supabaseAdmin.from('comments').select(COMMENT_COLUMNS).eq('version_id', id)
    .order('timestamp_start', { ascending: true, nullsFirst: true }).order('created_at')
  if (error) return NextResponse.json({ message: 'Could not load comments' }, { status: 500 })
  return NextResponse.json({ comments: (data ?? []).map(toReviewComment) }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request, { params }: Context) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  if (!isReviewer(user)) return forbidden()
  const { id } = await params
  const context = await versionContext(user, id, 'write')
  if (!context) return forbidden()
  const parsed = await parseJsonBody(request, schema)
  if (!parsed.ok) return parsed.response
  const { data: latest } = await supabaseAdmin.from('deliverable_versions').select('id').eq('content_item_id', context.item.id)
    .order('version', { ascending: false }).limit(1).maybeSingle()
  if (latest?.id !== id) return NextResponse.json({ message: 'Older versions are read only. Comment on the latest cut.' }, { status: 409 })

  const input = parsed.value
  let voiceKey: string | null = null
  const commentId = input.voice?.commentId ?? randomUUID()
  if (input.voice) {
    voiceKey = voiceNoteKey(context.item.agency_id, id, commentId, input.voice.ext)
    try {
      const object = await headObject(voiceKey)
      if (!object.ContentLength || object.ContentLength > MAX_VOICE_BYTES) return badRequest('The voice note is empty or too large')
    } catch { return badRequest('The voice note upload was not found. Record it again.') }
  }
  const { data, error } = await supabaseAdmin.from('comments').insert({
    id: commentId, agency_id: context.item.agency_id, version_id: id, author_id: user.id, author_label: user.full_name,
    timestamp_start: input.timestampStart ?? null, timestamp_end: input.timestampEnd ?? null,
    body: input.body || 'Voice note', voice_note_key: voiceKey, transcript_status: voiceKey ? 'pending' : null, source: 'internal',
  }).select(COMMENT_COLUMNS).single()
  if (error) return NextResponse.json({ message: 'Could not save the comment' }, { status: 500 })
  return NextResponse.json({ comment: toReviewComment(data) }, { status: 201 })
}
