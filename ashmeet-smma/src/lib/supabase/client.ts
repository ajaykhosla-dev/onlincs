import { createBrowserClient } from '@supabase/ssr'
import { publicEnv } from '@/lib/env.public'

// Browser-safe client: anon key only. RLS is the wall for anything it can reach.
export const supabase = createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey)
