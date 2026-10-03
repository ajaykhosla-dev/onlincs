import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/** Safe session diagnostic: reports whether verified JWT claims match current membership. */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ authenticated: false }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.getClaims()
  const claims = data?.claims
  const matchesDatabase = !error && claims?.workspace_user_id === user.id &&
    claims?.agency_id === user.agency_id && claims?.workspace_role === user.role
  return NextResponse.json({ authenticated: true, role: user.role, matchesDatabase }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
