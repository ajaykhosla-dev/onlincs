/** Dry-run unless --apply is supplied. Runs the additive Phase 5 migration in one transaction. */
import { readFile } from 'node:fs/promises'
import pg from 'pg'

const sql = await readFile('supabase/migrations/008_phase5_editor_media.sql','utf8')
if (!process.argv.includes('--apply')) {
  console.log(`Dry run: would apply 008_phase5_editor_media.sql (${sql.length} characters) in one transaction.`)
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
    and proname in ('phase5_assign_editor','phase5_complete_cut','phase5_complete_library','phase5_sync_version_status')`)
  if (checked.rows[0].count !== 4) throw new Error('Phase 5 functions were not all created')
  await db.query('commit')
  began = false
  console.log('Phase 5 migration committed: upload sessions, four functions, trigger, and service-role grants.')
} finally {
  if (began) await db.query('rollback')
  await db.end()
}
