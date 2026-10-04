import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/current-user'
import { parseJsonBody, unauthorized, forbidden } from '@/lib/api'
import { presignPart } from '@/lib/b2/presign'
import { canUploadCut, canUploadLibrary, getUploadSession, PART_SIZE } from '@/lib/phase5/upload'

const schema = z.object({ sessionId: z.uuid(), partNumber: z.number().int().min(1).max(10000) })

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  const body = await parseJsonBody(request,schema)
  if (!body.ok) return body.response
  const session = await getUploadSession(user,body.value.sessionId)
  if (!session || session.state !== 'active') return forbidden()
  const allowed = session.kind === 'cut'
    ? await canUploadCut(user,session.content_item_id!)
    : await canUploadLibrary(user,session.client_id!)
  if (!allowed || body.value.partNumber > Math.ceil(session.file_size_bytes/PART_SIZE)) return forbidden()
  try {
    const url = await presignPart(session.b2_key,session.b2_upload_id,body.value.partNumber)
    return NextResponse.json({ url })
  } catch { return NextResponse.json({ message: 'Could not sign upload part' },{ status: 502 }) }
}
