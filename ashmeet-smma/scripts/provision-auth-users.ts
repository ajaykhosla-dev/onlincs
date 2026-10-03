/** Pre-create Auth identities for active invited users without sending invitations.
 * Run after 004_auth_identity.sql and after enabling the Before User Created hook.
 * Default is read-only. Pass --apply to create missing Auth identities.
 */
import { supabaseAdmin } from '../src/lib/supabase/admin'

async function main() {
  const apply = process.argv.includes('--apply')
  const { data: invites, error } = await supabaseAdmin.from('users')
    .select('id,email,is_active,auth_user_id').order('id')
  if (error) throw error
  const { data, error: authError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
  if (authError) throw authError
  const existing = new Map(data.users.map(user => [user.email?.toLowerCase(), user]))
  for (const invite of invites ?? []) {
    if (!invite.is_active) continue
    const email = invite.email.toLowerCase()
    if (existing.has(email)) {
      const auth = existing.get(email)!
      if (invite.auth_user_id !== auth.id) throw new Error(`Identity link mismatch for ${invite.id}`)
      console.log(`${invite.id}: linked`)
      continue
    }
    if (!apply) { console.log(`${invite.id}: would create Auth identity`); continue }
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: invite.email, email_confirm: true,
    })
    if (createError) throw createError
    const { data: linked, error: linkError } = await supabaseAdmin.from('users')
      .select('auth_user_id').eq('id', invite.id).single()
    if (linkError || linked?.auth_user_id !== created.user.id) throw new Error(`Identity link failed for ${invite.id}`)
    console.log(`${invite.id}: linked`)
  }
}

main().catch(error => { console.error(error); process.exitCode = 1 })
