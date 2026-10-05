/**
 * Creates the hourly pg_cron job that calls /api/cron/staleness, plus a once-a-minute push flush.
 * Run once the app has a public URL:
 *   node --env-file=.env.local scripts/schedule-staleness-cron.mjs https://your-app.example.com          (dry run)
 *   node --env-file=.env.local scripts/schedule-staleness-cron.mjs https://your-app.example.com --apply
 * The job stores CRON_SECRET in the cron command, which only the database owner can read. Rotate it by re-running.
 */
import pg from 'pg'

const url = process.argv[2]
if (!url || !/^https:\/\//.test(url)) { console.error('Pass the app URL (https://...) as the first argument.'); process.exit(1) }
const base = url.replace(/\/$/, '')
const secret = process.env.CRON_SECRET
if (!secret) { console.error('CRON_SECRET is not set.'); process.exit(1) }
const call = (path) => `select net.http_post(url := '${base}${path}', headers := jsonb_build_object('Authorization', 'Bearer ${secret}', 'Content-Type', 'application/json'), body := '{}'::jsonb, timeout_milliseconds := 25000)`
const jobs = [['staleness-hourly', '0 * * * *', call('/api/cron/staleness')]]
if (!process.argv.includes('--apply')) { for (const [name, schedule] of jobs) console.log(`Dry run: would schedule ${name} at "${schedule}" against ${base}`); process.exit(0) }

const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL, ssl: { rejectUnauthorized: false } })
await db.connect()
try {
  for (const [name, schedule, command] of jobs) {
    await db.query('select cron.unschedule(jobid) from cron.job where jobname = $1', [name])
    await db.query('select cron.schedule($1, $2, $3)', [name, schedule, command])
    console.log(`Scheduled ${name} (${schedule})`)
  }
  console.log((await db.query('select jobname, schedule, active from cron.job order by jobname')).rows)
} finally { await db.end() }
