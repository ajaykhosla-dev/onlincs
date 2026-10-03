/** Read-only aggregate session check. Never prints tokens, cookies, or session IDs. */
import pg from 'pg'

async function main() {
  if (!process.env.TEST_DATABASE_URL) throw new Error('TEST_DATABASE_URL is required')
  const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await db.connect()
  try {
    const { rows } = await db.query(`
      select count(*)::int as sessions, max(s.created_at) as latest_created,
             max(s.not_after) as latest_not_after
      from auth.sessions s join auth.users a on a.id = s.user_id
      where lower(a.email) = lower($1)`, ['ashmeet@onlincs.com'])
    console.log(rows[0])
  } finally {
    await db.end()
  }
}

main().catch(error => { console.error(error); process.exitCode = 1 })
