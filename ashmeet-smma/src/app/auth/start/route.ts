import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase/route'
import { safeReturnTo } from '@/lib/auth/routing'

export async function GET(request: NextRequest) {
  const { client, applyCookies } = createSupabaseRouteClient(request)
  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: new URL('/auth/callback', request.url).toString() },
  })
  if (error || !data.url) return NextResponse.redirect(new URL('/auth/login?error=workspace_unavailable', request.url))
  const response = NextResponse.redirect(data.url)
  response.cookies.set('auth-return-to', safeReturnTo(request.nextUrl.searchParams.get('next') ?? undefined) ?? '/', {
    httpOnly: true, sameSite: 'lax', secure: request.nextUrl.protocol === 'https:', maxAge: 600, path: '/',
  })
  return applyCookies(response)
}
