import assert from 'node:assert/strict'
import pg from 'pg'

const client = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL, ssl: { rejectUnauthorized: false } })
await client.connect()
try {
  const result = await client.query(`
    select
      (select count(*)::int from pg_proc where proname like 'phase4_%' and pronamespace='public'::regnamespace) as functions,
      (select count(*)::int from information_schema.tables where table_schema='public' and table_name='shoot_folder_jobs') as jobs_table,
      (select count(*)::int from information_schema.columns where table_schema='public' and table_name='upload_sessions' and column_name='last_progress_at') as progress_column,
      (select count(*)::int from drive_sync_state where page_token like 'page-token-%' or page_token='seed-token') as fake_cursors,
      (select count(*)::int from shoots) as shoots,
      (select count(*)::int from shoot_items) as links
  `)
  const row = result.rows[0]
  assert.equal(row.functions, 7)
  assert.equal(row.jobs_table, 1)
  assert.equal(row.progress_column, 1)
  assert.equal(row.fake_cursors, 0)
  console.log(`Phase 4 live schema verified: ${row.functions} functions, folder jobs, progress column, zero fake cursors; existing ${row.shoots} shoots and ${row.links} links`)
  const recent = await client.query(`select s.id,s.title,s.drive_folder_id,j.status as folder_job,
    count(si.content_item_id)::int as ideas,
    count(si.drive_subfolder_id)::int as idea_folders
    from shoots s left join shoot_items si on si.shoot_id=s.id
    left join shoot_folder_jobs j on j.shoot_id=s.id
    where s.id not like 'sh-%' and s.id not like 'sh-n%'
    group by s.id,s.title,s.drive_folder_id,j.status
    order by s.scheduled_start desc limit 3`)
  for (const shoot of recent.rows) console.log(`Recent shoot: ${shoot.title}; folder job=${shoot.folder_job}; shoot folder=${shoot.drive_folder_id ? 'set' : 'missing'}; idea folders=${shoot.idea_folders}/${shoot.ideas}`)
} finally { await client.end() }
