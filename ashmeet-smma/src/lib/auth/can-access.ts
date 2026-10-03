import type { User } from '@/types/database'

export type Action = 'read' | 'write' | 'delete'

/**
 * A resource instance carrying just the ownership facts needed to decide access.
 * Callers load these from the row (and, for cameramen, the shoot_items join).
 */
export type Resource =
  | { type: 'agency'; agency_id: string }
  | { type: 'client'; agency_id: string; manager_id: string | null; assigned_editor_ids: string[] }
  | { type: 'content_item'; agency_id: string; client_manager_id: string | null; assigned_editor_id: string | null; shoot_cameraman_ids: string[] }
  | { type: 'shoot'; agency_id: string; client_manager_id: string | null; cameraman_id: string | null }
  | { type: 'deliverable'; agency_id: string; client_manager_id: string | null; assigned_editor_id: string | null }
  | { type: 'upload_session'; agency_id: string; started_by: string; cameraman_id: string | null }

/**
 * The only authorization logic in the codebase. RLS is the second wall.
 * Platform owner crosses agencies; everyone else is confined to their own.
 */
export function canAccess(user: User, resource: Resource, action: Action): boolean {
  if (!user.is_active) return false
  if (user.role === 'platform_owner') return true
  if (resource.agency_id !== user.agency_id) return false

  switch (user.role) {
    case 'admin':
      return true

    case 'brand_manager': {
      if (resource.type === 'agency' || resource.type === 'upload_session') return false
      const owns = (resource.type === 'client' ? resource.manager_id : resource.client_manager_id) === user.id
      if (!owns) return false
      // managers do not delete clients
      return resource.type === 'client' ? action !== 'delete' : true
    }

    case 'editor':
      switch (resource.type) {
        case 'content_item':
        case 'deliverable':
          return resource.assigned_editor_id === user.id && action !== 'delete'
        case 'client':
          return action === 'read' && resource.assigned_editor_ids.includes(user.id)
        default:
          return false
      }

    case 'cameraman':
      switch (resource.type) {
        case 'shoot':
          return resource.cameraman_id === user.id && action !== 'delete'
        case 'content_item':
          return action === 'read' && resource.shoot_cameraman_ids.includes(user.id)
        case 'upload_session':
          return resource.started_by === user.id && resource.cameraman_id === user.id && action !== 'delete'
        default:
          return false
      }

    default:
      return false
  }
}
