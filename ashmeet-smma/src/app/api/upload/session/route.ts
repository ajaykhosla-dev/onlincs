import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/current-user'
import { createUploadSession, findActiveSession } from '@/lib/drive/sessions'
import { badRequest, errorResponse, unauthorized } from '@/lib/api'

const body = z.object({
  shootId: z.string().min(1),
  contentItemId: z.string().min(1),
  fileName: z.string().min(1).max(255),
  fileSizeBytes: z.number().int().positive(),
  mimeType: z.string().min(1),
})

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  const parsed = body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return badRequest('Invalid request')
  const origin = req.headers.get('origin') ?? new URL(req.url).origin
  const result = await createUploadSession(user, { ...parsed.data, origin })
  return result.ok ? NextResponse.json(result.value) : errorResponse(result.error)
}

const query = z.object({
  shootId: z.string().min(1),
  contentItemId: z.string().min(1),
  fileName: z.string().min(1),
  fileSizeBytes: z.coerce.number().int().positive(),
})

/** Finds the caller's resumable session for a file, so a re-picked file can continue from Google's byte count. */
export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  const parsed = query.safeParse(Object.fromEntries(new URL(req.url).searchParams))
  if (!parsed.success) return badRequest('Invalid request')
  const found = await findActiveSession(user, parsed.data)
  return NextResponse.json({ sessionId: found?.sessionId ?? null })
}
