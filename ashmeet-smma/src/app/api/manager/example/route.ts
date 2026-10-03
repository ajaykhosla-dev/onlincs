import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { canAccess } from '@/lib/auth/can-access'
import { canEnterGroup } from '@/lib/auth/routing'
import { forbidden, parseJsonBody, unauthorized } from '@/lib/api'
import { roleExampleBody } from '@/lib/api/role-example'

/** Copy this order for feature routes: identity, role, resource permission, validated body. */
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  const resource = { type: 'client' as const, agency_id: user.agency_id, manager_id: user.id, assigned_editor_ids: [] }
  if (!canEnterGroup(user.role, 'manager') || !canAccess(user, resource, 'read')) return forbidden()
  const body = await parseJsonBody(request, roleExampleBody)
  if (!body.ok) return body.response
  return NextResponse.json({ userId: user.id, agencyId: user.agency_id, note: body.value.note })
}
