import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/current-user'
import { badRequest, forbidden, unauthorized } from '@/lib/api'
import { isReviewer } from '@/lib/phase6/review'
import { nearbyPosts } from '@/lib/phase7/data'

const query = z.object({ clientId: z.string().min(1), at: z.iso.datetime({ offset: true }), exclude: z.string().optional() })

/** Advisory: other posts for the same client within an hour of the chosen time. */
export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  if (!isReviewer(user)) return forbidden()
  const params = Object.fromEntries(new URL(request.url).searchParams)
  const parsed = query.safeParse(params)
  if (!parsed.success) return badRequest('Invalid request')
  return NextResponse.json({ nearby: await nearbyPosts(user, parsed.data.clientId, parsed.data.at, parsed.data.exclude) },
    { headers: { 'Cache-Control': 'no-store' } })
}
