import pg from 'pg'

const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL, ssl: { rejectUnauthorized: false } })
await db.connect()
try {
  const state = await db.query(`select
    (select count(*)::int from shoots where drive_folder_id is null and status<>'cancelled') as unprovisioned,
    (select count(*)::int from shoot_folder_jobs where status in ('pending','failed','running')) as incomplete_jobs,
    (select count(*)::int from raw_files where source='wrapper') as wrapper_files,
    (select count(*)::int from raw_files where source='drive_sync') as sync_files,
    (select count(*)::int from activity_log where action='raw_arrived') as arrival_logs,
    (select count(*)::int from notifications where type='raw_arrived') as arrival_notifications,
    (select last_polled_at from drive_sync_state where shared_drive_id=$1) as last_polled_at`,
    [process.env.GOOGLE_SHARED_DRIVE_ID])
  console.log(`Live totals: ${JSON.stringify(state.rows[0])}`)
  const incomplete = await db.query(`select s.id,s.title,s.status,j.status as job_status,j.attempts,j.last_error
    from shoots s left join shoot_folder_jobs j on j.shoot_id=s.id
    where s.drive_folder_id is null and s.status<>'cancelled' order by s.scheduled_start`)
  for (const row of incomplete.rows) console.log(`Unprovisioned shoot: ${JSON.stringify(row)}`)
  const test = await db.query(`select s.id,s.status,c.name as client_name,
    count(si.content_item_id)::int as ideas,
    count(si.content_item_id) filter (where si.raw_uploaded_at is not null)::int as marked,
    (select count(*)::int from raw_files r where r.shoot_id=s.id) as real_files
    from shoots s join clients c on c.id=s.client_id join shoot_items si on si.shoot_id=s.id
    where s.title='Title of Sasuke' group by s.id,s.status,c.name`)
  console.log(`Prepared shoot: ${JSON.stringify(test.rows[0])}`)
  const testIdeas = await db.query(`select si.content_item_id,ci.title,ci.status,ci.assigned_editor_id,
    si.drive_subfolder_id,si.raw_uploaded_at,si.marked_by
    from shoots s join shoot_items si on si.shoot_id=s.id
    join content_items ci on ci.id=si.content_item_id
    where s.title='Title of Sasuke' order by ci.title`)
  for (const row of testIdeas.rows) console.log(`Prepared idea: ${JSON.stringify(row)}`)
  const pending = await db.query(`select s.title,c.name as client_name from shoots s join clients c on c.id=s.client_id
    where s.scheduled_end<now() and s.status<>'cancelled' and not exists(select 1 from raw_files r where r.shoot_id=s.id)
    order by s.scheduled_start limit 20`)
  console.log(`Past shoots without real raw files: ${JSON.stringify(pending.rows)}`)
} finally { await db.end() }
