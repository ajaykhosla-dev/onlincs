/**
 * Applies one migration file in a single transaction. Dry run unless --apply.
 *   node --env-file=.env.local scripts/apply-migration.mjs supabase/migrations/011_phase8_notifications.sql [--apply]
 */
import { readFile } from 'node:fs/promises'
import pg from 'pg'

const file = process.argv[2]
if (!file) { console.error('Pass the migration file.'); process.exit(1) }
const sql = await readFile(file, 'utf8')
if (!process.argv.includes('--apply')) { console.log(`Dry run: would apply ${file} (${sql.length} characters) in one transaction.`); process.exit(0) }
const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL, ssl: { rejectUnauthorized: false } })
await db.connect()
let began = false
try {
  await db.query('begin'); began = true
  await db.query(sql)
  await db.query('commit'); began = false
  console.log(`Committed ${file}`)
} finally { if (began) await db.query('rollback'); await db.end() }
