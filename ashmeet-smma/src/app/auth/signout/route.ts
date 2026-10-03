import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseRouteClient } from '@/lib/supabase/route'

export async function POST(request: NextRequest) {
  const { client, applyCookies } = createSupabaseRouteClient(request)
  await client.auth.signOut()
  const response = NextResponse.redirect(new URL('/auth/login', request.url), { status: 303 })
  response.headers.set('Cache-Control', 'no-store')
  return applyCookies(response)
}
