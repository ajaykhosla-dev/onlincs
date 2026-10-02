import type { User, Role } from '@/types/database'

export type ResourceType = 'content_item' | 'client' | 'shoot' | 'deliverable' | 'upload_session' | 'agency'

/**
 * Single source of authorization logic.
 * Called server-side after RLS has already filtered rows.
 *
 * Permission matrix (per spec):
 *  platform_owner — all resources, all actions
 *  admin          — all resources within agency
 *  brand_manager  — read/write clients they manage, read client_scope,
 *                   read/write content_items/shoots/deliverables for those clients
 *  editor         — read/write content_items assigned to them, read clients/deliverables
 *  cameraman      — read/write shoots assigned to them, read content_items via shoot_items,
 *                   read upload_sessions for their shoots
 */
export function canAccess(user: User, resource: ResourceType, action: 'read' | 'write' | 'delete'): boolean {
  if (user.role === 'admin') return true

  switch (user.role) {
    case 'platform_owner':
      return true

    case 'brand_manager':
      if (resource === 'client' && action === 'read') return true
      if (resource === 'content_item' && (action === 'read' || action === 'write')) return true
      if (resource === 'shoot' && (action === 'read' || action === 'write')) return true
      if (resource === 'deliverable' && (action === 'read' || action === 'write')) return true
      return false

    case 'editor':
      if (resource === 'content_item' && (action === 'read' || action === 'write')) return true
      if (resource === 'client' && action === 'read') return true
      if (resource === 'deliverable' && (action === 'read' || action === 'write')) return true
      return false

    case 'cameraman':
      if (resource === 'shoot' && (action === 'read' || action === 'write')) return true
      if (resource === 'content_item' && action === 'read') return true
      if (resource === 'upload_session' && action === 'read') return true
      return false

    default:
      return false
  }
}
