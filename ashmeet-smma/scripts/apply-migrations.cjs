// Applies supabase/migrations/*.sql in filename order to TEST_DATABASE_URL, each file in one transaction.
// Refuses to run if the public schema already has tables, unless --reset is passed (which drops public first).
// Usage: node scripts/apply-migrations.cjs [--reset]
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const url = process.env.TEST_DATABASE_URL
if (!url) throw new Error('TEST_DATABASE_URL is not set')
const local = /127\.0\.0\.1|localhost/.test(url)

async function main() {
  const db = new Client({ connectionString: url, ssl: local ? undefined : { rejectUnauthorized: false } })
  await db.connect()
  const { rows } = await db.query("select count(*)::int as n from information_schema.tables where table_schema = 'public'")
  if (rows[0].n > 0) {
    if (!process.argv.includes('--reset')) throw new Error(`public already has ${rows[0].n} tables; pass --reset to drop it first`)
    await db.query('drop schema public cascade; create schema public;')
    await db.query('grant usage on schema public to anon, authenticated, service_role')
    await db.query('alter default privileges in schema public grant all on tables to anon, authenticated, service_role')
    await db.query('alter default privileges in schema public grant all on functions to anon, authenticated, service_role')
    console.log('public schema reset')
  }
  const dir = path.join(__dirname, '..', 'supabase', 'migrations')
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) {
    await db.query('begin')
    try {
      await db.query(fs.readFileSync(path.join(dir, f), 'utf8'))
      await db.query('commit')
      console.log('applied', f)
    } catch (e) {
      await db.query('rollback')
      console.error('FAILED', f, '-', e.message)
      process.exit(1)
    }
  }
  await db.end()
}
main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
