import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/current-user'
import { parseJsonBody, unauthorized } from '@/lib/api'
import { CATEGORIES, normalizePrefs } from '@/lib/push/prefs'
import { supabaseAdmin } from '@/lib/supabase/admin'

const clock = z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, 'Use a time like 22:00')
const schema = z.object({
  categories: z.object(Object.fromEntries(CATEGORIES.map((category) => [category, z.boolean()])) as Record<(typeof CATEGORIES)[number], z.ZodBoolean>),
  quiet_enabled: z.boolean(), quiet_start: clock, quiet_end: clock,
})

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  const { data } = await supabaseAdmin.from('notification_prefs').select('categories,quiet_enabled,quiet_start,quiet_end').eq('user_id', user.id).maybeSingle()
  return NextResponse.json({ prefs: normalizePrefs(data) }, { headers: { 'Cache-Control': 'no-store' } })
}

/** Preferences only ever suppress push. In-app notifications are written either way. */
export async function PUT(request: Request) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  const parsed = await parseJsonBody(request, schema)
  if (!parsed.ok) return parsed.response
  const { error } = await supabaseAdmin.from('notification_prefs').upsert(
    { user_id: user.id, agency_id: user.agency_id, ...parsed.value, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) return NextResponse.json({ message: 'Could not save your preferences' }, { status: 500 })
  return NextResponse.json({ prefs: normalizePrefs(parsed.value) })
}
