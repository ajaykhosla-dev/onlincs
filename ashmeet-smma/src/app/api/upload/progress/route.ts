import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { getProgress } from '@/lib/drive/sessions'
import { badRequest, errorResponse, unauthorized } from '@/lib/api'

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  const sessionId = new URL(req.url).searchParams.get('sessionId')
  if (!sessionId) return badRequest('sessionId is required')
  const result = await getProgress(user, sessionId)
  return result.ok ? NextResponse.json(result.value) : errorResponse(result.error)
}
