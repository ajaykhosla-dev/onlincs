import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { env } from '@/lib/env'
import { flushPush } from '@/lib/push/send'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const maxDuration = 60

function authorized(request: Request) {
  const given = Buffer.from(request.headers.get('authorization') ?? '')
  const expected = Buffer.from(`Bearer ${env.CRON_SECRET}`)
  return given.length === expected.length && timingSafeEqual(given, expected)
}

/**
 * Hourly job (pg_cron calls this; see scripts/schedule-staleness-cron.mjs). The database applies the
 * once-per-threshold rule, resolution and 48-hour escalation; this route then delivers the resulting pushes.
 */
async function run(request: Request) {
  if (!authorized(request)) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const started = Date.now()
  const { data, error } = await supabaseAdmin.rpc('phase8_run_staleness')
  if (error) { console.error('Staleness run failed', error.message); return NextResponse.json({ message: 'Staleness run failed' }, { status: 500 }) }
  const push = await flushPush().catch(() => ({ processed: 0, sent: 0 }))
  return NextResponse.json({ ...data, push, ms: Date.now() - started })
}

export const GET = run
export const POST = run
