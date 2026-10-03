/** Apply migration 004 in one transaction. Requires --apply to mutate the database. */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import pg from 'pg'

async function main() {
  const url = process.env.TEST_DATABASE_URL
  if (!url) throw new Error('TEST_DATABASE_URL is required')
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    const { rows } = await client.query<{ users: number; auth_users: number; migrated: boolean }>(`
      select (select count(*) from public.users)::int users,
             (select count(*) from auth.users)::int auth_users,
             exists(select 1 from information_schema.columns where table_schema='public'
               and table_name='users' and column_name='auth_user_id') migrated`)
    console.log(rows[0])
    if (!process.argv.includes('--apply')) return
    if (rows[0].migrated) throw new Error('Migration 004 already appears applied; inspect before rerunning')
    const sql = await readFile(resolve('supabase/migrations/004_auth_identity.sql'), 'utf8')
    await client.query('begin')
    try {
      await client.query(sql)
      await client.query('commit')
      console.log('Migration 004 committed')
    } catch (error) {
      await client.query('rollback')
      throw error
    }
  } finally {
    await client.end()
  }
}

main().catch(error => { console.error(error); process.exitCode = 1 })
