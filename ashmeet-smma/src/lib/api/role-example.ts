import { z } from 'zod'

/** Phase 2 route example payload. Feature routes can replace this with their own Zod schema. */
export const roleExampleBody = z.object({ note: z.string().trim().min(1).max(120) })
