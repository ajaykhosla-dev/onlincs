import { readFile } from 'node:fs/promises'
import pg from 'pg'

const url = process.env.TEST_DATABASE_URL
if (!url) throw new Error('TEST_DATABASE_URL is required')
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
await client.connect()
try {
  const before = await client.query("select count(*)::int n from pg_proc where proname = 'phase3_transition' and pronamespace = 'public'::regnamespace")
  if (before.rows[0].n) throw new Error('Phase 3 migration already appears applied; refusing to rerun')
  const sql = await readFile(new URL('../supabase/migrations/005_phase3.sql', import.meta.url), 'utf8')
  await client.query('begin')
  try {
    await client.query(sql)
    const functions = await client.query("select count(*)::int n from pg_proc where proname in ('phase3_transition','phase3_set_plan_status','phase3_save_client','phase3_save_content') and pronamespace = 'public'::regnamespace")
    if (functions.rows[0].n !== 4) throw new Error('Expected four Phase 3 functions')
    await client.query('commit')
    console.log('Migration 005 committed; four Phase 3 functions verified')
  } catch (error) {
    await client.query('rollback')
    throw error
  }
} finally {
  await client.end()
}
