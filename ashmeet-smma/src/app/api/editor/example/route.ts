import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { canAccess } from '@/lib/auth/can-access'
import { canEnterGroup } from '@/lib/auth/routing'
import { forbidden, parseJsonBody, unauthorized } from '@/lib/api'
import { roleExampleBody } from '@/lib/api/role-example'

/** The resource facts must come from a database row in real feature routes. */
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  const resource = { type: 'content_item' as const, agency_id: user.agency_id, client_manager_id: null, assigned_editor_id: user.id, shoot_cameraman_ids: [] }
  if (!canEnterGroup(user.role, 'editor') || !canAccess(user, resource, 'read')) return forbidden()
  const body = await parseJsonBody(request, roleExampleBody)
  if (!body.ok) return body.response
  return NextResponse.json({ userId: user.id, agencyId: user.agency_id, note: body.value.note })
}
