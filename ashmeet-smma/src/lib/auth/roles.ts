import type { Role } from '@/types/database'

// Role facts used for display only. Authorization decisions live in can-access.ts.
const TEAM_ROLES: readonly Role[] = ['brand_manager', 'editor', 'cameraman']

/** Agency staff other than the owner/admin, i.e. the people listed on the Team screen. */
export const isTeamRole = (role: Role) => TEAM_ROLES.includes(role)

const TAG_VARIANT: Partial<Record<Role, 'lav' | 'sky' | 'mint'>> = { brand_manager: 'lav', editor: 'sky', cameraman: 'mint' }

/** Tag colour for a role badge, matching the approved prototype. */
export const roleTagVariant = (role: Role): 'lav' | 'sky' | 'mint' => TAG_VARIANT[role] ?? 'mint'
