/** The pooled Google Drive ceiling and the rules around it. Pure, so the SQL alerts and the screen share one definition. */
export const DRIVE_POOL_BYTES = 2 * 1024 ** 4 // 2 TiB; phase8_stale_candidates uses the same 2199023255552
export const WARN_70 = 0.7
export const WARN_85 = 0.85
export const ELIGIBLE_AFTER_DAYS = 30
export const MAX_DELETE_PER_REQUEST = 10

export const levelFor = (used: number): 'ok' | 'warn70' | 'warn85' =>
  used >= WARN_85 * DRIVE_POOL_BYTES ? 'warn85' : used >= WARN_70 * DRIVE_POOL_BYTES ? 'warn70' : 'ok'

export function formatBytes(bytes: number) {
  if (bytes >= 1024 ** 4) return `${(bytes / 1024 ** 4).toFixed(2)} TB`
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${Math.round(bytes / 1024)} KB`
}

/** The phrase an admin must type to delete: it names the number of shoots so it cannot be pasted blindly. */
export const confirmationPhrase = (count: number) => `delete ${count} ${count === 1 ? 'shoot' : 'shoots'}`
