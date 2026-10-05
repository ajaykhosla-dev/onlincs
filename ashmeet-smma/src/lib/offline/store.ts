'use client'

/**
 * Offline support for the cameraman. His schedule is cached after every successful load, and "mark raw uploaded"
 * is queued when there is no connection. Both live in localStorage under his user id, so they survive an app
 * restart and never leak to the next person on a shared phone.
 */

export type QueuedMark = { id: string; shootId: string; itemId: string; queuedAt: string }
type Saved<T> = { savedAt: string; data: T }

const scheduleKey = (userId: string) => `offline:schedule:${userId}`
const queueKey = (userId: string) => `offline:queue:${userId}`

function read<T>(key: string): T | null {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : null } catch { return null }
}
function write(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true } catch { return false }
}

export function saveSchedule<T>(userId: string, data: T) { write(scheduleKey(userId), { savedAt: new Date().toISOString(), data } satisfies Saved<T>) }
export function loadSchedule<T>(userId: string): Saved<T> | null { return read<Saved<T>>(scheduleKey(userId)) }

export const readQueue = (userId: string): QueuedMark[] => read<QueuedMark[]>(queueKey(userId)) ?? []
export function enqueueMark(userId: string, shootId: string, itemId: string): QueuedMark[] {
  const queue = readQueue(userId)
  if (!queue.some((entry) => entry.shootId === shootId && entry.itemId === itemId))
    queue.push({ id: crypto.randomUUID(), shootId, itemId, queuedAt: new Date().toISOString() })
  write(queueKey(userId), queue)
  return queue
}

/**
 * Sends queued marks in order. An entry is removed only once the server accepts it (or reports it can never
 * succeed, such as a shoot that no longer exists); a network failure stops the run and keeps the rest.
 */
const flushing = new Set<string>()
export async function flushQueue(userId: string, send: (entry: QueuedMark) => Promise<Response>): Promise<{ sent: number; remaining: QueuedMark[] }> {
  // One flush at a time per person: the mount and the "online" event can both fire, and would otherwise send every entry twice.
  if (flushing.has(userId)) return { sent: 0, remaining: readQueue(userId) }
  flushing.add(userId)
  try {
    const done = new Set<string>()
    let sent = 0
    for (const entry of readQueue(userId)) {
      try {
        const response = await send(entry)
        // 401 means the session ended, not that the mark is wrong: keep it for after the next sign-in.
        if (response.status === 401) break
        if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429)) { done.add(entry.id); if (response.ok) sent++ }
        else break
      } catch { break }
    }
    // Re-read so a mark queued while this run was in flight is kept.
    const remaining = readQueue(userId).filter((entry) => !done.has(entry.id))
    write(queueKey(userId), remaining)
    return { sent, remaining }
  } finally { flushing.delete(userId) }
}
