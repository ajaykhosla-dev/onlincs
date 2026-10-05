import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { publicEnv } from '@/lib/env.public'
import { supportWriteBlocked } from '@/lib/platform/guard'
import { ELEVATION_COOKIE, SUPPORT_COOKIE } from '@/lib/platform/signed'

/** Fast sign-in gate. Role and active membership checks happen again in server layouts. */
/** Support sessions are read-only (see lib/platform/guard.ts). The database is the second wall: the actor is not an admin of any agency. */
function supportWriteGuard(request: NextRequest) {
  const blocked = supportWriteBlocked({ method: request.method, pathname: request.nextUrl.pathname,
    supportCookie: request.cookies.get(SUPPORT_COOKIE)?.value, elevationCookie: request.cookies.get(ELEVATION_COOKIE)?.value })
  return blocked ? NextResponse.json({ error: 'support_read_only', message: 'This is a read-only support session. Turn on changes from the banner first.' }, { status: 403 }) : null
}

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) return supportWriteGuard(request) ?? NextResponse.next()
  const storageKey = `sb-${new URL(publicEnv.supabaseUrl).hostname.split('.')[0]}-auth-token`
  const hadSessionCookie = request.cookies.getAll().some(cookie =>
    cookie.name === storageKey || cookie.name.startsWith(`${storageKey}.`))
  let response = NextResponse.next({ request })
  response.headers.set('Cache-Control', 'private, no-store, max-age=0')
  const supabase = createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() { return request.cookies.getAll() },
      setAll(items) {
        items.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        response.headers.set('Cache-Control', 'private, no-store, max-age=0')
        items.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })
  let { data: { user } } = await supabase.auth.getUser()
  // On a cold browser/server start, the first Auth lookup can fail while SSR
  // refreshes a persisted session. Retry only when a session cookie exists.
  if (!user) {
    if (hadSessionCookie) {
      const retry = await supabase.auth.getUser()
      user = retry.data.user
      if (!user) return response // Server layout makes the final active-user check.
    }
  }
  if (user) return response

  const login = new URL('/auth/login', request.url)
  login.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search)
  const redirect = NextResponse.redirect(login)
  redirect.headers.set('Cache-Control', 'private, no-store, max-age=0')
  response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie))
  return redirect
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/manager/:path*',
    '/editor/:path*',
    '/cameraman/:path*',
    '/platform/:path*',
    '/dev/upload/:path*',
    '/account/:path*',
    '/api/:path*',
  ],
}
