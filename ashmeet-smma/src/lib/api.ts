import 'server-only'
import { NextResponse } from 'next/server'
import type { UploadError } from '@/lib/drive/sessions'

const STATUS: Record<UploadError['code'], number> = { forbidden: 403, not_found: 404, no_folder: 409, expired: 410, upstream: 502 }

export const errorResponse = (e: UploadError) =>
  NextResponse.json({ error: e.code, message: e.message, recoverable: 'recoverable' in e }, { status: STATUS[e.code] })

export const unauthorized = () => NextResponse.json({ error: 'unauthorized', message: 'Sign in required' }, { status: 401 })
export const badRequest = (message: string) => NextResponse.json({ error: 'bad_request', message }, { status: 400 })
