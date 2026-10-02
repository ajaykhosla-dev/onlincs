import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

// Browser-safe client (uses anon key — server-side RLS will protect data)
export const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY, // use service role as placeholder — replace with anon key
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
