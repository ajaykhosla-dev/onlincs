import { readFile } from 'node:fs/promises'
import pg from 'pg'

const url = process.env.TEST_DATABASE_URL
if (!url) throw new Error('TEST_DATABASE_URL is required')
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
await client.connect()
try {
  const before = await client.query("select count(*)::int n from pg_proc where proname = 'phase4_create_shoot' and pronamespace = 'public'::regnamespace")
  if (before.rows[0].n) throw new Error('Phase 4 migration already appears applied; refusing to rerun')
  const sql = await readFile(new URL('../supabase/migrations/006_phase4_shoots.sql', import.meta.url), 'utf8')
  await client.query('begin')
  try {
    await client.query(sql)
    const functions = await client.query("select count(*)::int n from pg_proc where proname in ('phase4_create_shoot','phase4_add_shoot_item','phase4_update_shoot','phase4_cancel_shoot','phase4_arrival','phase4_mark_raw') and pronamespace = 'public'::regnamespace")
    if (functions.rows[0].n !== 6) throw new Error('Expected six Phase 4 functions')
    const columns = await client.query("select count(*)::int n from information_schema.columns where table_schema='public' and table_name='upload_sessions' and column_name='last_progress_at'")
    if (columns.rows[0].n !== 1) throw new Error('Upload progress column is missing')
    await client.query('commit')
    console.log('Migration 006 committed; six functions, folder jobs, and upload progress column verified')
  } catch (error) { await client.query('rollback'); throw error }
} finally { await client.end() }
