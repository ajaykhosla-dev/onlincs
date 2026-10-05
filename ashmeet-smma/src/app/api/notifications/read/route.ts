import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/current-user'
import { parseJsonBody, unauthorized } from '@/lib/api'
import { supabaseAdmin } from '@/lib/supabase/admin'

const schema = z.union([z.object({ ids: z.array(z.string().min(1)).min(1).max(100) }), z.object({ all: z.literal(true) })])

/** Marks the signed-in user's own notifications read: some by id, or all of them. Other people's ids are ignored. */
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  const parsed = await parseJsonBody(request, schema)
  if (!parsed.ok) return parsed.response
  let query = supabaseAdmin.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id).is('read_at', null)
  if ('ids' in parsed.value) query = query.in('id', parsed.value.ids)
  const { error } = await query
  if (error) return NextResponse.json({ message: 'Could not update notifications' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
