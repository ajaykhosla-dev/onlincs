import { z } from 'zod'

/** Captions need real room: well past Instagram's 2,200 so nothing is silently cut. */
export const postFields = {
  scheduledAt: z.iso.datetime({ offset: true }),
  caption: z.string().max(10000).default(''),
  music: z.string().trim().max(300).default(''),
}
export const scheduleSchema = z.object({ itemId: z.string().min(1), ...postFields })
export const editSchema = z.object(postFields)
export const postedSchema = z.object({ posted: z.boolean() })
