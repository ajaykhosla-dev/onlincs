import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

// Service-role client — server-only, bypasses RLS.
// NEVER import this into a client component.
export const supabaseAdmin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
)

// Guard to prevent importing into client components
if (typeof window !== 'undefined') {
  throw new Error('supabaseAdmin must never be imported into a client component')
}
