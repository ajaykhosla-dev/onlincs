import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

// Service-role client — bypasses RLS. `server-only` makes importing this from a
// client component a build error.
export const supabaseAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
