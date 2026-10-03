import { z } from 'zod'

export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)
const nullableDate = z.union([z.iso.date(), z.literal(''), z.null()]).transform((v) => v || null)
const nullableText = z.union([z.string(), z.null()]).transform((v) => v || null)
export const scopeSchema = z.object({
  reel_count: z.number().int().min(0), post_count: z.number().int().min(0),
  carousel_count: z.number().int().min(0), story_count: z.number().int().min(0),
  notes: nullableText.optional(),
})
export const clientSchema = z.object({
  code: z.string().trim().min(2).max(30), name: z.string().trim().min(2).max(120),
  handle: z.string().trim().max(120), niche: z.string().trim().min(2).max(120),
  manager_id: z.string().min(1), status: z.enum(['active', 'onboarding', 'paused', 'churned']),
  scope: scopeSchema.optional(),
})
export const contentSchema = z.object({
  title: z.string().trim().min(2).max(200), type: z.enum(['reel', 'post', 'carousel', 'story']),
  concept: nullableText.optional(), script: nullableText.optional(), instructions_editor: nullableText.optional(),
  instructions_cameraman: nullableText.optional(), reference_links: z.array(z.url()).max(30).default([]),
  planned_date: nullableDate, planned_time: nullableText.optional(), assigned_editor_id: nullableText.optional(),
  deadline: nullableDate.optional(),
})
export const planStatusSchema = z.object({ status: z.enum(['draft', 'sent_to_client', 'approved', 'changes_requested']) })
