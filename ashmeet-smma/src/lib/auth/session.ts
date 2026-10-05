import 'server-only'
import { redirect } from 'next/navigation'
import { getSessionState } from '@/lib/auth/current-user'
import { canEnterGroup, type WorkspaceGroup } from '@/lib/auth/routing'

/** Layouts enforce access on the server; client state and JWT role claims are never trusted here. */
export async function requireGroupUser(group: WorkspaceGroup) {
  const { user, suspended } = await getSessionState()
  if (suspended) redirect('/auth/login?error=suspended')
  if (!user) redirect('/auth/login?expired=1')
  if (!canEnterGroup(user.role, group)) redirect('/403')
  return user
}
