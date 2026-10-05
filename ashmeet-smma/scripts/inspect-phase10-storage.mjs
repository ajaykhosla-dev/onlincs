/** Read-only comparison data for Phase 10 storage verification. */
import pg from 'pg'

const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL, ssl: { rejectUnauthorized: false } })
await db.connect()
try {
  const summary = await db.query(`select count(*)::int files, sum(size_bytes)::bigint bytes,
    count(*) filter (where drive_file_id is null)::int missing_drive_id
    from raw_files where agency_id='ag-1'`)
  const largest = await db.query(`select id,file_name,size_bytes,drive_file_id from raw_files
    where agency_id='ag-1' order by size_bytes desc limit 15`)
  console.log({ summary: summary.rows[0], largest: largest.rows })
} finally { await db.end() }
