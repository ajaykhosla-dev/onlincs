import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import pg from 'pg'

const client = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL, ssl: { rejectUnauthorized: false } })
await client.connect()
try {
  await client.query('begin')
  await client.query(await readFile(new URL('../supabase/migrations/007_phase4_item_eligibility.sql', import.meta.url), 'utf8'))
  const input = { client_id: 'cl-4', title: 'Eligibility rollback test', cameraman_id: 'u-7',
    scheduled_start: '2026-10-25T04:30:00Z', scheduled_end: '2026-10-25T06:30:00Z', location: 'Ludhiana' }
  const allowed = await client.query('select phase4_create_shoot($1::jsonb,$2::text[],$3) as value', [JSON.stringify(input), ['ci-34'], 'u-1'])
  assert.ok(allowed.rows[0].value.id)
  await client.query('savepoint forbidden_item')
  await assert.rejects(client.query('select phase4_create_shoot($1::jsonb,$2::text[],$3)', [JSON.stringify(input), ['ci-15'], 'u-1']),
    /calendar approved or already shoot scheduled/)
  await client.query('rollback to savepoint forbidden_item')
  console.log('Phase 4 eligibility passes: approved idea accepted; posted idea rejected atomically')
} finally { await client.query('rollback'); await client.end() }
