import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/current-user'
import { parseJsonBody, unauthorized } from '@/lib/api'
import { supabaseAdmin } from '@/lib/supabase/admin'

const subscribeSchema = z.object({
  endpoint: z.url().max(2000),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
})
const removeSchema = z.object({ endpoint: z.url().max(2000) })

/** Stores one device. The endpoint is unique, so re-subscribing (or signing in as someone else on a shared device) moves it. */
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  const parsed = await parseJsonBody(request, subscribeSchema)
  if (!parsed.ok) return parsed.response
  const { error } = await supabaseAdmin.from('push_subscriptions').upsert({
    id: randomUUID(), agency_id: user.agency_id, user_id: user.id, endpoint: parsed.value.endpoint,
    p256dh: parsed.value.keys.p256dh, auth: parsed.value.keys.auth, user_agent: (request.headers.get('user-agent') ?? '').slice(0, 300),
  }, { onConflict: 'endpoint' })
  if (error) return NextResponse.json({ message: 'Could not save this device' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  const parsed = await parseJsonBody(request, removeSchema)
  if (!parsed.ok) return parsed.response
  await supabaseAdmin.from('push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', parsed.value.endpoint)
  return NextResponse.json({ ok: true })
}

/** How many devices this person has on file, so settings can say so. */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  const { count } = await supabaseAdmin.from('push_subscriptions').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
  return NextResponse.json({ devices: count ?? 0 })
}
