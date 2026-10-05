import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/current-user'
import { forbidden, parseJsonBody, unauthorized } from '@/lib/api'
import { voiceNoteKey } from '@/lib/b2/keys'
import { presignPut } from '@/lib/b2/presign'
import { isReviewer, versionContext } from '@/lib/phase6/review'

const VOICE_MAX_SECONDS = 120
const schema = z.object({ versionId: z.string().min(1), ext: z.enum(['webm', 'mp4']) })

/** Voice notes go browser to B2 by presigned URL; the audio never passes through this server. */
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  if (!isReviewer(user)) return forbidden()
  const parsed = await parseJsonBody(request, schema)
  if (!parsed.ok) return parsed.response
  const context = await versionContext(user, parsed.value.versionId, 'write')
  if (!context) return forbidden()
  const commentId = randomUUID()
  const contentType = parsed.value.ext === 'webm' ? 'audio/webm' : 'audio/mp4'
  const key = voiceNoteKey(context.item.agency_id, parsed.value.versionId, commentId, parsed.value.ext)
  return NextResponse.json({ commentId, uploadUrl: await presignPut(key, contentType, 10 * 60), contentType, maxSeconds: VOICE_MAX_SECONDS },
    { headers: { 'Cache-Control': 'no-store' } })
}
