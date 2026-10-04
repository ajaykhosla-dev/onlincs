import { z } from 'zod'

export const shootBody = z.object({
  client_id: z.string().min(1), title: z.string().trim().min(2).max(180),
  scheduled_start: z.iso.datetime({ offset: true }), scheduled_end: z.iso.datetime({ offset: true }),
  location: z.string().trim().max(250), cameraman_id: z.string().min(1),
  content_item_ids: z.array(z.string().min(1)).min(1).max(30),
})
export const shootEditBody = shootBody.omit({ client_id: true, content_item_ids: true })
