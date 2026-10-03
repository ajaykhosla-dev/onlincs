import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { User } from '@/types/database'

/** Resolves the signed-in person to their users row. Only invited, active users resolve; everyone else is null. */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  const { data } = await supabaseAdmin.from('users').select('*').eq('auth_user_id', user.id).eq('is_active', true).maybeSingle()
  const person = data as User | null
  return person && user.email?.toLowerCase() === person.email.toLowerCase() ? person : null
}
