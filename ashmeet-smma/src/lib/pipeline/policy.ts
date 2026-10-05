import type { ContentStatus, Role } from '@/types/database'

export const allowedTransitions: Record<ContentStatus, readonly ContentStatus[]> = {
  planned: ['calendar_approved', 'archived'],
  calendar_approved: ['shoot_scheduled', 'with_editor', 'archived'],
  shoot_scheduled: ['raw_uploaded', 'archived'],
  raw_uploaded: ['with_editor', 'archived'],
  with_editor: ['cut_submitted', 'archived'],
  cut_submitted: ['changes_requested', 'internally_approved', 'archived'],
  changes_requested: ['with_editor', 'archived'],
  internally_approved: ['with_client', 'client_changes', 'archived'],
  with_client: ['client_changes', 'client_approved', 'archived'],
  client_changes: ['with_editor', 'archived'],
  client_approved: ['scheduled', 'archived'],
  scheduled: ['posted', 'archived'],
  posted: ['archived'],
  archived: [],
}

/** Reachable only through the Phase 6 review/link/client routes and the Phase 7 posting routes, never the generic transition. */
export const reviewOwnedStatuses: readonly ContentStatus[] = ['changes_requested', 'internally_approved', 'with_client', 'client_changes', 'client_approved', 'scheduled', 'posted']

const transitionRoles: Partial<Record<ContentStatus, readonly Role[]>> = {
  calendar_approved: ['admin', 'brand_manager'],
  shoot_scheduled: ['admin', 'brand_manager'],
  raw_uploaded: ['admin', 'brand_manager'],
  with_editor: ['admin', 'brand_manager', 'editor'],
  cut_submitted: ['admin', 'brand_manager', 'editor'],
  changes_requested: ['admin', 'brand_manager'],
  internally_approved: ['admin', 'brand_manager'],
  with_client: ['admin', 'brand_manager'],
  client_changes: ['admin', 'brand_manager'],
  client_approved: ['admin', 'brand_manager'],
  scheduled: ['admin', 'brand_manager'],
  posted: ['admin', 'brand_manager'],
  archived: ['admin', 'brand_manager'],
}

export class TransitionError extends Error {
  statusCode: number
  constructor(message: string, statusCode: number) { super(message); this.statusCode = statusCode }
}

export function validateTransition(from: ContentStatus, to: ContentStatus, role: Role) {
  if (!allowedTransitions[from].includes(to)) throw new TransitionError(`Cannot move content item from ${from} to ${to}`, 409)
  if (!transitionRoles[to]?.includes(role)) throw new TransitionError(`Role ${role} cannot move an item to ${to}`, 403)
}
