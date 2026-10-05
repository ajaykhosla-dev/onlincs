/** Notification preferences and the rules that apply them. Pure, so it is unit-tested without a database. */

export const CATEGORIES = ['shoots', 'raw', 'edits', 'review', 'posting', 'alerts'] as const
export type Category = (typeof CATEGORIES)[number]

export const CATEGORY_LABELS: Record<Category, { label: string; hint: string }> = {
  shoots: { label: 'Shoots', hint: 'A shoot is scheduled or changed' },
  raw: { label: 'Raw footage', hint: 'Raw footage has arrived' },
  edits: { label: 'Edits', hint: 'An edit is assigned, or changes are requested' },
  review: { label: 'Review and approval', hint: 'A cut is ready, a client opens a link, approves or asks for changes' },
  posting: { label: 'Posting', hint: 'A post is due today' },
  alerts: { label: 'Alerts', hint: 'Something has been waiting too long, or storage is filling up' },
}

const TYPE_GROUP: Record<string, Category> = {
  shoot_scheduled: 'shoots',
  raw_arrived: 'raw',
  edit_assigned: 'edits',
  revision: 'edits',
  cut_submitted: 'review',
  approval: 'review',
  link_viewed: 'review',
  post_due: 'posting',
  stale: 'alerts',
  storage: 'alerts',
}
/** Unknown types fall into "alerts" so a new kind of notification is never silently dropped. */
export const categoryForType = (type: string): Category => TYPE_GROUP[type] ?? 'alerts'

export type Prefs = {
  categories: Record<Category, boolean>
  quiet_enabled: boolean
  quiet_start: string
  quiet_end: string
}

/** Everything on, quiet hours 10pm to 8am IST. */
export const DEFAULT_PREFS: Prefs = {
  categories: { shoots: true, raw: true, edits: true, review: true, posting: true, alerts: true },
  quiet_enabled: true, quiet_start: '22:00', quiet_end: '08:00',
}

export function normalizePrefs(row: Partial<Prefs> | null | undefined): Prefs {
  const categories = { ...DEFAULT_PREFS.categories }
  const stored = (row?.categories ?? {}) as Partial<Record<Category, boolean>>
  for (const category of CATEGORIES) if (typeof stored[category] === 'boolean') categories[category] = stored[category]!
  return { categories, quiet_enabled: row?.quiet_enabled ?? DEFAULT_PREFS.quiet_enabled,
    quiet_start: row?.quiet_start ?? DEFAULT_PREFS.quiet_start, quiet_end: row?.quiet_end ?? DEFAULT_PREFS.quiet_end }
}

const minutes = (clock: string) => { const [h, m] = clock.split(':').map(Number); return h * 60 + m }

/** Minutes since midnight in IST for an instant. */
export function istMinutes(now: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).format(now)
  return minutes(parts)
}

/** Quiet hours may wrap midnight (22:00 to 08:00). Equal start and end means no quiet window. */
export function inQuietHours(prefs: Prefs, now = new Date()) {
  if (!prefs.quiet_enabled) return false
  const start = minutes(prefs.quiet_start), end = minutes(prefs.quiet_end), at = istMinutes(now)
  if (start === end) return false
  return start < end ? at >= start && at < end : at >= start || at < end
}

export type PushDecision = 'send' | 'category_off' | 'quiet_hours'
/** Preferences only ever suppress push. The in-app notification row is written regardless. */
export function pushDecision(type: string, prefs: Prefs, now = new Date()): PushDecision {
  if (!prefs.categories[categoryForType(type)]) return 'category_off'
  if (inQuietHours(prefs, now)) return 'quiet_hours'
  return 'send'
}
