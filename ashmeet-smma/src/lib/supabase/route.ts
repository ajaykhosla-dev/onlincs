import 'server-only'
import { createServerClient } from '@supabase/ssr'
import type { NextRequest, NextResponse } from 'next/server'
import { publicEnv } from '@/lib/env.public'

/** Keep PKCE/session cookie writes and attach them to the final redirect response. */
export function createSupabaseRouteClient(request: NextRequest) {
  const pending: Array<{ name: string; value: string; options?: Record<string, unknown> }> = []
  const client = createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() { return request.cookies.getAll() },
      setAll(items) {
        items.forEach(({ name, value, options }) => {
          request.cookies.set(name, value)
          pending.push({ name, value, options })
        })
      },
    },
  })
  function applyCookies(response: NextResponse) {
    pending.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
    return response
  }
  return { client, applyCookies }
}
