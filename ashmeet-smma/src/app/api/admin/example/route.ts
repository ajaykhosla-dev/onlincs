import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { canAccess } from '@/lib/auth/can-access'
import { canEnterGroup } from '@/lib/auth/routing'
import { forbidden, parseJsonBody, unauthorized } from '@/lib/api'
import { roleExampleBody } from '@/lib/api/role-example'

/** Phase 2 pattern: resolve identity, check role and resource, validate input, then return data. */
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  if (!canEnterGroup(user.role, 'admin') || !canAccess(user, { type: 'agency', agency_id: user.agency_id }, 'read')) return forbidden()
  const body = await parseJsonBody(request, roleExampleBody)
  if (!body.ok) return body.response
  return NextResponse.json({ userId: user.id, agencyId: user.agency_id, note: body.value.note })
}
