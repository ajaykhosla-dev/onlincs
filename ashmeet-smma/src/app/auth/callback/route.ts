import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase/route'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { homeForRole, safeReturnTo } from '@/lib/auth/routing'
import type { User } from '@/types/database'

export async function GET(request: NextRequest) {
  const { client, applyCookies } = createSupabaseRouteClient(request)
  const code = request.nextUrl.searchParams.get('code')
  if (!code) {
    const denied = request.nextUrl.searchParams.get('error_description')?.includes("isn't part of a workspace")
    return NextResponse.redirect(new URL(`/auth/login?error=${denied ? 'not_invited' : 'workspace_unavailable'}`, request.url))
  }
  const { data, error } = await client.auth.exchangeCodeForSession(code)
  if (error || !data.user?.email) return applyCookies(NextResponse.redirect(new URL('/auth/login?error=workspace_unavailable', request.url)))

  const { data: row, error: lookupError } = await supabaseAdmin.from('users')
    .select('id,email,agency_id,role,auth_user_id').eq('auth_user_id', data.user.id).eq('is_active', true).maybeSingle()
  const user = row as Pick<User, 'id' | 'email' | 'agency_id' | 'role'> | null
  if (lookupError || !user || user.email.toLowerCase() !== data.user.email.toLowerCase() || !homeForRole(user.role)) {
    await client.auth.signOut()
    return applyCookies(NextResponse.redirect(new URL(`/auth/login?error=${lookupError ? 'workspace_unavailable' : 'not_invited'}`, request.url)))
  }
  const target = safeReturnTo(request.cookies.get('auth-return-to')?.value) ?? homeForRole(user.role)!
  const response = NextResponse.redirect(new URL(target, request.url))
  response.cookies.delete('auth-return-to')
  return applyCookies(response)
}
