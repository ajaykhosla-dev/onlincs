-- ============================================================
-- Phase 0 — Step 3 & 5: Schema + Seed Verification
-- Paste this entire block into the Supabase SQL Editor and run it.
-- Expected: all checks return green (no FAIL rows).
-- ============================================================

-- 1. All 18 tables exist
select
  'tables' as check_group,
  table_name,
  'OK' as status
from information_schema.tables
where table_schema = 'public'
  and table_name not like 'pg_%'
order by table_name;

-- 2. Row counts per table (sanity check — all should be > 0)
select
  'row_counts' as check_group,
  'agencies'              as table_name, count(*)::text as cnt from agencies
union ALL select 'row_counts','users',              count(*)::text from users
union ALL select 'row_counts','clients',            count(*)::text from clients
union ALL select 'row_counts','client_scope',       count(*)::text from client_scope
union ALL select 'row_counts','content_items',      count(*)::text from content_items
union ALL select 'row_counts','monthly_plans',      count(*)::text from monthly_plans
union ALL select 'row_counts','shoots',             count(*)::text from shoots
union ALL select 'row_counts','shoot_items',        count(*)::text from shoot_items
union ALL select 'row_counts','upload_sessions',    count(*)::text from upload_sessions
union ALL select 'row_counts','raw_files',          count(*)::text from raw_files
union ALL select 'row_counts','deliverable_versions',count(*)::text from deliverable_versions
union ALL select 'row_counts','comments',           count(*)::text from comments
union ALL select 'row_counts','approval_links',     count(*)::text from approval_links
union ALL select 'row_counts','post_schedule',      count(*)::text from post_schedule
union ALL select 'row_counts','library_assets',     count(*)::text from library_assets
union ALL select 'row_counts','activity_log',       count(*)::text from activity_log
union ALL select 'row_counts','drive_sync_state',   count(*)::text from drive_sync_state
union ALL select 'row_counts','notifications',      count(*)::text from notifications
order by table_name;

-- 3. All 14 content statuses exist
select
  'statuses' as check_group,
  expected.status,
  count(ci.id)::text as cnt
from unnest(enum_range(null::content_status)) as expected(status)
left join content_items ci on ci.status = expected.status
group by expected.status
order by expected.status;

-- 4. Each status has >= 2 rows (detect failures)
select
  'status_coverage' as check_group,
  s as status,
  cnt::text
from (
  select unnest(enum_range(null::content_status)) as s
) expected
left join (
  select status, count(*) as cnt
  from content_items
  group by status
) actual on actual.status = expected.s
where actual.cnt < 2 OR actual.cnt IS NULL;

-- 5. Enums exist
select
  'enums' as check_group,
  n.nspname as schema,
  t.typname as enum_name
from pg_type t
join pg_namespace n on n.oid = t.typnamespace
where t.typtype = 'e'
  and n.nspname = 'public'
order by t.typname;

-- 6. Indexes exist
select
  'indexes' as check_group,
  indexname as index_name,
  tablename
from pg_indexes
where schemaname = 'public'
  and indexname not like '%_pkey'
order by tablename, indexname;
