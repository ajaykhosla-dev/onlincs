import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { publicEnv } from '@/lib/env.public'

export async function createSupabaseServerClient() {
  const store = await cookies()
  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() { return store.getAll() },
      setAll(items) {
        try { items.forEach(({ name, value, options }) => store.set(name, value, options)) }
        catch { /* Server Components cannot write cookies; proxy refreshes them. */ }
      },
    },
  })
}
