import 'server-only'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { User } from '@/types/database'

/** Resolves the signed-in person to their users row. Only invited, active users resolve; everyone else is null. */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email
  if (!email) return null
  const { data } = await supabaseAdmin.from('users').select('*').eq('email', email).eq('is_active', true).maybeSingle()
  return (data as User | null) ?? null
}
