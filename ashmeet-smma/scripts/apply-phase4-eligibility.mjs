import { readFile } from 'node:fs/promises'
import pg from 'pg'

const client = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL, ssl: { rejectUnauthorized: false } })
await client.connect()
try {
  const before = await client.query("select count(*)::int n from pg_trigger where tgname='trg_phase4_validate_shoot_item' and not tgisinternal")
  if (before.rows[0].n) throw new Error('Phase 4 eligibility trigger already exists; refusing to rerun')
  await client.query('begin')
  try {
    await client.query(await readFile(new URL('../supabase/migrations/007_phase4_item_eligibility.sql', import.meta.url), 'utf8'))
    const after = await client.query("select count(*)::int n from pg_trigger where tgname='trg_phase4_validate_shoot_item' and not tgisinternal")
    if (after.rows[0].n !== 1) throw new Error('Eligibility trigger missing')
    await client.query('commit')
    console.log('Migration 007 committed; new shoot links require approved or shoot-scheduled content')
  } catch (error) { await client.query('rollback'); throw error }
} finally { await client.end() }
