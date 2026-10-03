import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/current-user'
import { completeUpload } from '@/lib/drive/sessions'
import { badRequest, errorResponse, unauthorized } from '@/lib/api'

const body = z.object({ sessionId: z.string().min(1), driveFileId: z.string().min(1) })

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  const parsed = body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return badRequest('Invalid request')
  const result = await completeUpload(user, parsed.data.sessionId, parsed.data.driveFileId)
  return result.ok ? NextResponse.json(result.value) : errorResponse(result.error)
}
