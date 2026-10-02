import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { env } from '@/lib/env'
import type { User } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: User & { id: string; role: string }
  }
}

const handler = NextAuth({
  providers: [
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!
        session.user.role = (token.role as string) || 'brand_manager'
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = 'brand_manager'
      }
      return token
    },
  },
  pages: {
    signIn: '/auth/login',
  },
  session: {
    strategy: 'jwt',
  },
})

export { handler as GET, handler as POST }
