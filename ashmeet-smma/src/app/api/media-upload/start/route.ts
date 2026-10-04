import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/current-user'
import { badRequest, parseJsonBody, unauthorized } from '@/lib/api'
import { ActiveMediaUploadError, MAX_CUT_SIZE, startMediaUpload } from '@/lib/phase5/upload'

const schema = z.object({
  kind: z.enum(['cut','library']), itemId: z.string().optional(), clientId: z.string().optional(),
  folderName: z.string().trim().min(1).max(80).optional(), fileName: z.string().trim().min(1).max(255),
  fileSize: z.number().int().positive().max(MAX_CUT_SIZE - 1), contentType: z.string().min(1).max(100),
})

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  const body = await parseJsonBody(request,schema)
  if (!body.ok) return body.response
  const input = body.value
  if (input.kind === 'cut' && (!/\.mp4$/i.test(input.fileName) || input.contentType !== 'video/mp4'))
    return badRequest('Finished cuts must be H.264 MP4 files')
  if (input.kind === 'library' && !input.folderName) return badRequest('Library folder name required')
  try {
    const session = await startMediaUpload(user,input)
    if (!session) return NextResponse.json({ error: 'forbidden' },{ status: 403 })
    return NextResponse.json(session,{ status: 201 })
  } catch (error) {
    if (error instanceof ActiveMediaUploadError)
      return NextResponse.json({ message: error.message, sessionId: error.sessionId },{ status: 409 })
    return NextResponse.json({ message: 'Could not start B2 upload' },{ status: 502 })
  }
}
