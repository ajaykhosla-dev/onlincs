import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { UploadError } from '@/lib/drive/sessions'

const STATUS: Record<UploadError['code'], number> = { forbidden: 403, not_found: 404, no_folder: 409, expired: 410, upstream: 502 }

export const errorResponse = (e: UploadError) =>
  NextResponse.json({ error: e.code, message: e.message, recoverable: 'recoverable' in e }, { status: STATUS[e.code] })

export const unauthorized = () => NextResponse.json({ error: 'unauthorized', message: 'Sign in required' }, { status: 401 })
export const badRequest = (message: string) => NextResponse.json({ error: 'bad_request', message }, { status: 400 })
export const forbidden = () => NextResponse.json({ error: 'forbidden', message: 'You do not have access to this resource' }, { status: 403 })

/** Shared route boundary: return only a Zod field message, never the raw input or a stack trace. */
export async function parseJsonBody<T extends z.ZodType>(request: Request, schema: T): Promise<
  | { ok: true; value: z.output<T> }
  | { ok: false; response: NextResponse<{ error: string; message: string }> }
> {
  const json = await request.json().catch(() => null)
  const result = schema.safeParse(json)
  if (!result.success) {
    return { ok: false, response: badRequest(result.error.issues[0]?.message ?? 'Invalid request body') }
  }
  return { ok: true, value: result.data }
}
