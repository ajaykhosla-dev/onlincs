/**
 * Phase 0 verification script.
 * Run: npx tsx scripts/verify-phase0.ts
 *
 * Checks:
 *  1. .env.local has no placeholder values for critical vars
 *  2. Google Drive API is accessible with service account
 *  3. Supabase project is reachable
 *  4. Database tables exist (via Supabase REST API)
 *  5. Cross-tenant isolation (query ag-1 data, verify no ag-2 leaks)
 */

import { env } from '../src/lib/env'
import { supabaseAdmin } from '../src/lib/supabase/admin'
import { drive } from '../src/lib/drive/folders'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const anyAdmin = supabaseAdmin as any

let passed = 0
let failed = 0

function check(name: string, condition: boolean, detail?: string | null) {
  if (condition) {
    console.log(`  ✓ ${name}`)
    passed++
  } else {
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
    failed++
  }
}

async function main() {
  console.log('\n=== Phase 0 Verification ===\n')

  // 1. Env check
  console.log('1. Environment variables:')
  check('NEXT_PUBLIC_SUPABASE_URL set', !!env.NEXT_PUBLIC_SUPABASE_URL && !env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder'))
  check('SUPABASE_SERVICE_ROLE_KEY set', !!env.SUPABASE_SERVICE_ROLE_KEY && env.SUPABASE_SERVICE_ROLE_KEY.length > 30)
  check('AUTH_SECRET set', !!env.AUTH_SECRET && env.AUTH_SECRET.length > 30)
  check('GOOGLE_SERVICE_ACCOUNT_KEY set', !!env.GOOGLE_SERVICE_ACCOUNT_KEY && env.GOOGLE_SERVICE_ACCOUNT_KEY.includes('private_key'))
  check('CREDENTIAL_ENCRYPTION_KEY set', !!env.CREDENTIAL_ENCRYPTION_KEY && env.CREDENTIAL_ENCRYPTION_KEY.length > 20)

  // 2. Supabase connectivity
  console.log('\n2. Supabase connectivity:')
  try {
    const r = await anyAdmin.from('agencies').select('count').limit(1)
    const result = r as { data: unknown; error: { message?: string } | null }
    check('Supabase reachable', !result.error, result.error?.message)
  } catch (e) {
    check('Supabase reachable', false, String(e))
  }

  // 3. Google Drive accessibility
  console.log('\n3. Google Drive API:')
  try {
    const driveApi = drive
    const res = await driveApi.about.get({ fields: 'user(emailAddress)' })
    check('Drive API accessible', !!res.data.user?.emailAddress, res.data.user?.emailAddress as string | null)
  } catch (e) {
    check('Drive API accessible', false, String(e))
  }

  // 4. Database tables
  console.log('\n4. Database tables:')
  const tables = [
    'agencies', 'users', 'clients', 'content_items', 'shoots',
    'deliverable_versions', 'comments', 'upload_sessions', 'raw_files',
    'post_schedule', 'activity_log', 'library_assets', 'monthly_plans',
    'client_scope', 'shoot_items', 'approval_links', 'push_subscriptions', 'notifications'
  ]
  for (const table of tables) {
    try {
      const { error } = await anyAdmin.from(table).select('*').limit(1)
      check(`Table: ${table}`, !error, error?.message)
    } catch (e) {
      check(`Table: ${table}`, false, String(e))
    }
  }

  // 5. Cross-tenant isolation
  console.log('\n5. Cross-tenant isolation:')
  try {
    // Query ag-1 users
    const { data: ag1Users } = await anyAdmin.from('users').select('*').eq('agency_id', 'ag-1')
    const ag1Emails = (ag1Users as any[]).map((u: any) => u.email)
    check('ag-1 has users', ag1Emails.length > 0, `found ${ag1Emails.length}`)

    // Query ag-2 users
    const { data: ag2Users } = await anyAdmin.from('users').select('*').eq('agency_id', 'ag-2')
    const ag2Emails = (ag2Users as any[]).map((u: any) => u.email)
    check('ag-2 has users', ag2Emails.length > 0, `found ${ag2Emails.length}`)

    // Verify no overlap
    const overlap = ag1Emails.filter((e: string) => ag2Emails.includes(e))
    check('No email overlap between agencies', overlap.length === 0)

    // Verify ag-1 content items don't belong to ag-2 clients
    const { data: ag1Content } = await anyAdmin.from('content_items').select('client_id').eq('agency_id', 'ag-1')
    const { data: ag2Clients } = await anyAdmin.from('clients').select('id').eq('agency_id', 'ag-2')
    const ag2ClientIds = new Set((ag2Clients as any[]).map((c: any) => c.id))
    const leaked = (ag1Content as any[]).filter((ci: any) => ag2ClientIds.has(ci.client_id))
    check('No content items leak to wrong agency', leaked.length === 0)

    // Verify ag-2 content items don't belong to ag-1 clients
    const { data: ag2Content } = await anyAdmin.from('content_items').select('client_id').eq('agency_id', 'ag-2')
    const { data: ag1Clients } = await anyAdmin.from('clients').select('id').eq('agency_id', 'ag-1')
    const ag1ClientIds = new Set((ag1Clients as any[]).map((c: any) => c.id))
    const leaked2 = (ag2Content as any[]).filter((ci: any) => ag1ClientIds.has(ci.client_id))
    check('No reverse content leaks', leaked2.length === 0)
  } catch (e) {
    check('Cross-tenant isolation', false, String(e))
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(e => {
  console.error('Verification failed:', e)
  process.exit(1)
})
