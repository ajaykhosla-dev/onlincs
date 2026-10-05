import { NextResponse } from 'next/server'
import { exportAgency, getAgency } from '@/lib/platform/agencies'
import { platformApi, platformLog } from '@/lib/platform/auth'

export const maxDuration = 60
type Context = { params: Promise<{ id: string }> }

/** The agency's complete data as JSON plus a media manifest. An agency that cannot leave will not sign up. */
export async function GET(_request: Request, { params }: Context) {
  const guard = await platformApi()
  if ('response' in guard) return guard.response
  const { id } = await params
  const agency = await getAgency(id)
  if (!agency) return NextResponse.json({ message: 'Agency not found' }, { status: 404 })
  try {
    const payload = await exportAgency(id)
    await platformLog(guard.user, id, 'data_exported', id, { tables: payload.counts })
    return new NextResponse(JSON.stringify(payload, null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${agency.slug}-export-${new Date().toISOString().slice(0, 10)}.json"`, 'Cache-Control': 'no-store' } })
  } catch { return NextResponse.json({ message: 'Could not prepare the export' }, { status: 500 }) }
}
