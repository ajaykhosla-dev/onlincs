import type { Role } from '@/types/database'

export type WorkspaceGroup = 'admin' | 'manager' | 'editor' | 'cameraman' | 'platform'

const HOME: Partial<Record<Role, string>> = {
  admin: '/admin/clients',
  brand_manager: '/manager/clients',
  editor: '/editor/todo',
  cameraman: '/cameraman/shoots',
  platform_owner: '/platform',
}

export function homeForRole(role: Role): string | null {
  return HOME[role] ?? null
}

export function canEnterGroup(role: Role, group: WorkspaceGroup): boolean {
  if (role === 'platform_owner') return true
  return (
    (role === 'admin' && group === 'admin') ||
    (role === 'brand_manager' && group === 'manager') ||
    (role === 'editor' && group === 'editor') ||
    (role === 'cameraman' && group === 'cameraman')
  )
}

/** Only local workspace paths can be used as OAuth return targets. */
export function safeReturnTo(value: string | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null
  try {
    const url = new URL(value, 'http://localhost')
    return url.origin === 'http://localhost' ? url.pathname + url.search + url.hash : null
  } catch {
    return null
  }
}
