import { createClient } from '@supabase/supabase-js'
import { publicEnv } from '@/lib/env.public'

// Browser-safe client: anon key only. RLS is the wall for anything it can reach.
export const supabase = createClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
