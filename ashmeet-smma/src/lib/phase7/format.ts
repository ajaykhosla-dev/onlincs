/** Pure helpers shared by the posting routes, screens and tests. Times are stored UTC and shown IST. */

export const IST = 'Asia/Kolkata'
export const slug = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

/** `ramana-dental-smile-makeover-v3.mp4` rather than the raw B2 key. */
export function cutFilename(client: string, idea: string, version: number) {
  const base = `${slug(client) || 'client'}-${slug(idea) || 'idea'}`.slice(0, 120).replace(/-+$/g, '')
  return `${base}-v${version}.mp4`
}

/** `YYYY-MM-DD` of an instant as seen in IST. */
export const istDate = (value: string | Date) => new Intl.DateTimeFormat('en-CA', { timeZone: IST }).format(new Date(value))
export const istTime = (value: string | Date) =>
  new Intl.DateTimeFormat('en-IN', { timeZone: IST, hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(value)).toLowerCase()
export const istDateTime = (value: string | Date) =>
  new Intl.DateTimeFormat('en-IN', { timeZone: IST, day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(value)).toLowerCase()

/** An IST wall-clock date and time ("2026-10-05", "15:30") as the UTC instant to store. */
export const istToIso = (date: string, time: string) => new Date(`${date}T${time}:00+05:30`).toISOString()

/** UTC instants bounding an IST calendar month ("2026-10"). */
export function istMonthBounds(month: string) {
  const [year, index] = month.split('-').map(Number)
  const next = index === 12 ? `${year + 1}-01` : `${year}-${String(index + 1).padStart(2, '0')}`
  return { start: new Date(`${month}-01T00:00:00+05:30`).toISOString(), end: new Date(`${next}-01T00:00:00+05:30`).toISOString() }
}

/** Whole IST calendar days between a past instant and now; 0 for today. */
export function daysLate(scheduledAt: string, now = new Date()) {
  const a = Date.parse(`${istDate(scheduledAt)}T00:00:00Z`), b = Date.parse(`${istDate(now)}T00:00:00Z`)
  return Math.max(0, Math.round((b - a) / 864e5))
}

export const NEARBY_MINUTES = 60
export const UNDO_HOURS = 24

/** `HH:mm` (24-hour) of an instant in IST, for a time input. */
export const istClock = (value: string | Date) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: IST, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value))
