/**
 * QA helper: gives the four seeded approval links real, known tokens and the PIN 1234 so the expired, revoked,
 * responded and active states can be opened in a browser. Dry-run unless --apply. Seed data only; never run in production use.
 *   al-1 active    /approve/<token>   al-2 expired   al-3 revoked   al-4 responded
 */
import { createHash, randomBytes, scryptSync } from 'node:crypto'
import pg from 'pg'

const tokens = { 'al-1': 'active', 'al-2': 'expired', 'al-3': 'revoked', 'al-4': 'responded' }
const token = (name) => `seed-${name}-link-`.padEnd(43, '0')
const pinHash = () => { const salt = randomBytes(16); return `s1$${salt.toString('hex')}$${scryptSync('1234', salt, 32).toString('hex')}` }

for (const [id, name] of Object.entries(tokens)) console.log(`${id}: /approve/${token(name)}  (PIN 1234)`)
if (!process.argv.includes('--apply')) { console.log('Dry run: nothing written. Pass --apply to update the seeded rows.'); process.exit(0) }

const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL, ssl: { rejectUnauthorized: false } })
await db.connect()
try {
  await db.query('begin')
  for (const [id, name] of Object.entries(tokens)) {
    const result = await db.query('update approval_links set token_hash=$1, pin_hash=$2, failed_attempts=0, locked_at=null where id=$3',
      [createHash('sha256').update(token(name)).digest('hex'), pinHash(), id])
    if (result.rowCount !== 1) throw new Error(`Seeded link ${id} not found`)
  }
  await db.query('commit')
  console.log('Seeded links updated.')
} catch (error) { await db.query('rollback'); throw error } finally { await db.end() }
