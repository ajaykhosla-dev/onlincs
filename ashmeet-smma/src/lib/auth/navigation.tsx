import type { RailItem } from '@/components/shared/Rail'
import {
  IconCalendar, IconClients, IconClock, IconDen, IconLibrary, IconPlanner,
  IconPerformance, IconRedo, IconSettings, IconTeam, IconTodo, IconUpload,
} from '@/components/shared/icons'
import type { NavBadges } from '@/lib/auth/badges'
import type { User } from '@/types/database'
import type { WorkspaceGroup } from '@/lib/auth/routing'

export function navigationFor(user: User, group: WorkspaceGroup, badges: NavBadges = {}): { items: RailItem[]; foot?: RailItem[] } {
  // Platform owners can inspect any group; other users only receive their own group's links.
  if (user.role !== 'platform_owner') {
    const own = { admin: 'admin', brand_manager: 'manager', editor: 'editor', cameraman: 'cameraman', client_viewer: '' }[user.role]
    if (own !== group) return { items: [] }
  }

  switch (group) {
    case 'admin':
      return {
        items: [
          { key: 'clients', label: 'Clients', href: '/admin/clients', icon: <IconClients /> },
          { key: 'calendar', label: 'Calendar', href: '/admin/calendar', icon: <IconCalendar /> },
          { key: 'den', label: "Editors' den", href: '/admin/den', icon: <IconDen />, badge: badges.den || undefined },
          { key: 'library', label: 'Library', href: '/admin/library', icon: <IconLibrary /> },
          { key: 'posting', label: 'Posting schedule', href: '/admin/posting', icon: <IconClock /> },
          { key: 'planner', label: 'Content planner', href: '/admin/planner', icon: <IconPlanner /> },
          { key: 'scope', label: 'Scope of work', href: '/admin/scope', icon: <IconPerformance /> },
          { key: 'team', label: 'Team', href: '/admin/team', icon: <IconTeam /> },
        ],
        foot: [{ key: 'settings', label: 'Settings', href: '/admin/settings', icon: <IconSettings /> }],
      }
    case 'manager':
      return { items: [
        { key: 'clients', label: 'Clients', href: '/manager/clients', icon: <IconClients /> },
        { key: 'calendar', label: 'Calendar', href: '/manager/calendar', icon: <IconCalendar /> },
        { key: 'den', label: "Editors' den", href: '/manager/den', icon: <IconDen />, badge: badges.den || undefined },
        { key: 'posting', label: 'Posting schedule', href: '/manager/posting', icon: <IconClock /> },
        { key: 'planner', label: 'Content planner', href: '/manager/planner', icon: <IconPlanner /> },
        { key: 'scope', label: 'Scope of work', href: '/manager/scope', icon: <IconPerformance /> },
        { key: 'storage', label: 'Storage', href: '/manager/storage', icon: <IconLibrary /> },
      ] }
    case 'editor':
      return { items: [
        { key: 'todo', label: 'To do', href: '/editor/todo', icon: <IconTodo />, badge: badges.todo || undefined },
        { key: 'redo', label: 'Re do', href: '/editor/redo', icon: <IconRedo />, badge: badges.redo || undefined },
        { key: 'library', label: 'Library', href: '/editor/library', icon: <IconLibrary /> },
      ] }
    case 'cameraman':
      return { items: [
        { key: 'shoots', label: 'Calendar', href: '/cameraman/shoots', icon: <IconCalendar /> },
        { key: 'pending', label: 'Pending uploads', href: '/cameraman/pending', icon: <IconUpload />, badge: badges.pending || undefined },
      ] }
    default:
      return { items: [] }
  }
}
