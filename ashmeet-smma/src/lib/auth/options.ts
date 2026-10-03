import 'server-only'
import type { NextAuthOptions } from 'next-auth'
import Google from 'next-auth/providers/google'
import { env } from '@/lib/env'

// Interim sign-in config. Phase 2 replaces this with Supabase Auth per techstack.md.
// The session role is NOT trusted for authorization: getCurrentUser() re-reads the users table.
export const authOptions: NextAuthOptions = {
  secret: env.AUTH_SECRET,
  providers: [Google({ clientId: env.GOOGLE_OAUTH_CLIENT_ID, clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET })],
  pages: { signIn: '/auth/login' },
  session: { strategy: 'jwt' },
}
