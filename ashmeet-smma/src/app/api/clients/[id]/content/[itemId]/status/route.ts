import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/current-user'
import { forbidden, parseJsonBody, unauthorized } from '@/lib/api'
import { getClientFor } from '@/lib/phase3/data'
import { reviewOwnedStatuses } from '@/lib/pipeline/policy'
import { transition, TransitionError } from '@/lib/pipeline/transitions'
import type { ContentStatus } from '@/types/database'

type Context = { params: Promise<{ id: string; itemId: string }> }
const schema = z.object({ toStatus: z.enum(['planned','calendar_approved','shoot_scheduled','raw_uploaded','with_editor','cut_submitted','changes_requested','internally_approved','with_client','client_changes','client_approved','scheduled','posted','archived']) })
export async function POST(request: Request, { params }: Context) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  const body = await parseJsonBody(request, schema)
  if (!body.ok) return body.response
  if (body.value.toStatus === 'with_editor' || body.value.toStatus === 'cut_submitted')
    return NextResponse.json({ message: 'Use Editors’ den to assign work and the cut uploader to submit it.' }, { status: 409 })
  if (reviewOwnedStatuses.includes(body.value.toStatus as ContentStatus))
    return NextResponse.json({ message: 'Review, client and posting steps run from Editors’ den and the Posting schedule.' }, { status: 409 })
  const { id, itemId } = await params
  if (!await getClientFor(user, id, 'write')) return forbidden()
  try { return NextResponse.json(await transition(itemId, body.value.toStatus as ContentStatus, user, id)) }
  catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : 'Could not change status' }, { status: error instanceof TransitionError ? error.statusCode : 500 }) }
}
