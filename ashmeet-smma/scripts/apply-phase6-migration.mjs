/** Dry-run unless --apply is supplied. Runs the additive Phase 6 migration in one transaction. */
import { readFile } from 'node:fs/promises'
import pg from 'pg'

const sql = await readFile('supabase/migrations/009_phase6_review.sql', 'utf8')
if (!process.argv.includes('--apply')) {
  console.log(`Dry run: would apply 009_phase6_review.sql (${sql.length} characters) in one transaction.`)
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
    and proname in ('phase6_review_decision','phase6_reopen_item','phase6_create_link','phase6_revoke_link',
      'phase6_pin_attempt','phase6_record_view','phase6_client_respond')`)
  if (checked.rows[0].count !== 7) throw new Error('Phase 6 functions were not all created')
  await db.query('commit')
  began = false
  console.log('Phase 6 migration committed: comment/link columns, view log, seven functions, service-role grants.')
} finally {
  if (began) await db.query('rollback')
  await db.end()
}
