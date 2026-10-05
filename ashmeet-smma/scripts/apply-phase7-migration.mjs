/** Dry-run unless --apply is supplied. Runs the additive Phase 7 migration in one transaction. */
import { readFile } from 'node:fs/promises'
import pg from 'pg'

const sql = await readFile('supabase/migrations/010_phase7_posting.sql', 'utf8')
if (!process.argv.includes('--apply')) {
  console.log(`Dry run: would apply 010_phase7_posting.sql (${sql.length} characters) in one transaction.`)
  process.exit(0)
}
const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL, ssl: { rejectUnauthorized: false } })
await db.connect()
let began = false
try {
  await db.query('begin')
  began = true
  await db.query(sql)
  const checked = await db.query(`select count(*)::int as count from pg_proc where pronamespace='public'::regnamespace
    and proname in ('phase7_schedule_post','phase7_update_post','phase7_mark_posted','phase7_unmark_posted')`)
  if (checked.rows[0].count !== 4) throw new Error('Phase 7 functions were not all created')
  await db.query('commit')
  began = false
  console.log('Phase 7 migration committed: updated_at, one-post-per-item index, four functions, service-role grants.')
} finally {
  if (began) await db.query('rollback')
  await db.end()
}
