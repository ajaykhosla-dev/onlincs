import { NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/api'
import { getAgency } from '@/lib/platform/agencies'
import { platformApi, platformLog } from '@/lib/platform/auth'
import { integrationPatch, integrationSummary, saveIntegration, testConnection } from '@/lib/platform/integrations'

export const maxDuration = 60
type Context = { params: Promise<{ id: string }> }

/** Fingerprints and last-four only. A stored credential can be set and rotated, never read back. */
export async function GET(_request: Request, { params }: Context) {
  const guard = await platformApi()
  if ('response' in guard) return guard.response
  const { id } = await params
  if (!await getAgency(id)) return NextResponse.json({ message: 'Agency not found' }, { status: 404 })
  return NextResponse.json(await integrationSummary(id), { headers: { 'Cache-Control': 'no-store' } })
}

export async function PUT(request: Request, { params }: Context) {
  const guard = await platformApi()
  if ('response' in guard) return guard.response
  const { id } = await params
  if (!await getAgency(id)) return NextResponse.json({ message: 'Agency not found' }, { status: 404 })
  const parsed = await parseJsonBody(request, integrationPatch)
  if (!parsed.ok) return parsed.response
  try {
    const { changed, rotated } = await saveIntegration(id, parsed.value)
    if (!changed.length && !rotated.length) return NextResponse.json({ message: 'Nothing to change' }, { status: 400 })
    // Field names only: the audit trail records that a credential was set or rotated, never what it was.
    await platformLog(guard.user, id, rotated.length ? 'credential_rotated' : 'credential_set', id, { set: changed, rotated })
    return NextResponse.json({ changed, rotated, integrations: await integrationSummary(id) })
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Could not save the credentials' }, { status: 400 })
  }
}

/** Runs the real Drive and B2 checks with this agency's credentials and reports each step. */
export async function POST(_request: Request, { params }: Context) {
  const guard = await platformApi()
  if ('response' in guard) return guard.response
  const { id } = await params
  if (!await getAgency(id)) return NextResponse.json({ message: 'Agency not found' }, { status: 404 })
  const steps = await testConnection(id)
  await platformLog(guard.user, id, 'connection_tested', id, { passed: steps.filter((s) => s.status === 'pass').length, failed: steps.filter((s) => s.status === 'fail').map((s) => s.name) })
  return NextResponse.json({ steps, ok: steps.every((step) => step.status !== 'fail') })
}
