import { NextResponse } from 'next/server'
import { env } from '@/lib/env'
import { runPhase4Sync } from '@/lib/phase4/sync'

export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${env.CRON_SECRET}`) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  try { return NextResponse.json(await runPhase4Sync()) }
  catch (error) { console.error('Phase 4 sync failed', error); return NextResponse.json({ message: 'Phase 4 sync failed' }, { status: 500 }) }
}
