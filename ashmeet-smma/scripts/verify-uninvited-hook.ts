/** Test the live Before User Created hook through public sign-up, not the bypassing admin API. */
import { randomBytes, randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

async function main() {
  if (!process.argv.includes('--apply')) {
    console.log('Read-only preview: add --apply to test a disposable public sign-up and automatic cleanup')
    return
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key || !anonKey) throw new Error('Supabase URL and keys are required')
  const admin = createClient(url, key, { auth: { persistSession: false } })
  const publicClient = createClient(url, anonKey, { auth: { persistSession: false } })
  const email = `phase2-check-${randomUUID()}@example.com`
  const { error } = await publicClient.auth.signUp({ email, password: randomBytes(36).toString('base64url') })
  const { data: users, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (listError) throw listError
  const created = users.users.find(user => user.email === email)
  if (created) {
    const { error: deleteError } = await admin.auth.admin.deleteUser(created.id)
    if (deleteError) throw new Error(`The invite hook allowed an uninvited account, and cleanup failed: ${deleteError.message}`)
    throw new Error('The invite hook allowed an uninvited account; the disposable account was removed')
  }
  if (!error) throw new Error('Sign-up returned success without an Auth user; hook outcome is unclear')
  if (!error.message.includes("isn't part of a workspace") && !error.message.toLowerCase().includes('hook')) {
    throw new Error(`The invite was rejected for another reason: ${error.message}`)
  }
  console.log(`Before User Created hook rejected public sign-up; no account was created (${error.code ?? 'no code'})`)
}

main().catch(error => { console.error(error); process.exitCode = 1 })
