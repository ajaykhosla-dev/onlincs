// Client-safe values only. Next inlines NEXT_PUBLIC_* at build time.
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  appUrl: process.env.NEXT_PUBLIC_APP_URL!,
  vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
}
