import 'server-only'
import { env } from '@/lib/env'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Invites an agency's first admin. Sign-in is Google only, so the invite creates the Auth identity (the database links it
 * to the pre-created users row by email) and, when the project's email is configured, mails a welcome link. If sending the
 * email fails the identity still exists and the admin can sign in with Google; the caller is told which happened.
 */
export async function inviteAdmin(email: string): Promise<{ identity: 'created' | 'exists'; emailSent: boolean; note?: string }> {
  const redirectTo = `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/auth/callback`
  const invited = await supabaseAdmin.auth.admin.inviteUserByEmail(email, { redirectTo })
  if (!invited.error) return { identity: 'created', emailSent: true }
  if (/already|registered|exists/i.test(invited.error.message)) return { identity: 'exists', emailSent: false, note: 'This email already has a sign-in identity.' }
  const created = await supabaseAdmin.auth.admin.createUser({ email, email_confirm: true })
  if (created.error && !/already|registered|exists/i.test(created.error.message)) throw new Error('Could not create the sign-in identity')
  return { identity: created.error ? 'exists' : 'created', emailSent: false,
    note: 'The invitation email could not be sent. The admin can sign in directly with that Google account.' }
}
