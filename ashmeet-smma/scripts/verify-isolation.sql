-- ============================================================
-- Phase 0 — Step 9: Cross-Tenant Isolation Verification
-- Paste this entire block into the Supabase SQL Editor and run it.
-- Expected: all checks return ZERO rows (no leaks).
-- ============================================================

-- 1. Both agencies exist exactly once
select
  'agencies exist' as check_name,
  count(*) filter (where id = 'ag-1') as ag_1_count,
  count(*) filter (where id = 'ag-2') as ag_2_count
from agencies
having count(*) filter (where id = 'ag-1') != 1
    or count(*) filter (where id = 'ag-2') != 1;

-- 2. Users — correct counts, no email overlap
select
  'users — ag-1 count' as check_name,
  count(*) filter (where agency_id = 'ag-1') as ag_1,
  count(*) filter (where agency_id = 'ag-2') as ag_2
from users
having count(*) filter (where agency_id = 'ag-1') < 8
   or count(*) filter (where agency_id = 'ag-2') < 5;

-- 3. Clients — correct counts
select
  'clients — ag-1 count' as check_name,
  count(*) filter (where agency_id = 'ag-1') as ag_1,
  count(*) filter (where agency_id = 'ag-2') as ag_2
from clients
having count(*) filter (where agency_id = 'ag-1') < 6
   or count(*) filter (where agency_id = 'ag-2') < 1;

-- 4. Content items — correct counts
select
  'content_items — ag-1 count' as check_name,
  count(*) filter (where agency_id = 'ag-1') as ag_1,
  count(*) filter (where agency_id = 'ag-2') as ag_2
from content_items
having count(*) filter (where agency_id = 'ag-1') < 36
   or count(*) filter (where agency_id = 'ag-2') < 1;

-- 5. CRITICAL: No content item from ag-1 references an ag-2 client
select
  'LEAK — ag-1 content → ag-2 client' as check_name,
  ci.id, ci.title, ci.agency_id, c.id as client_id, c.name as client_name
from content_items ci
join clients c on c.id = ci.client_id
where ci.agency_id = 'ag-1'
  and c.agency_id != 'ag-1';

-- 6. CRITICAL: No content item from ag-2 references an ag-1 client
select
  'LEAK — ag-2 content → ag-1 client' as check_name,
  ci.id, ci.title, ci.agency_id, c.id as client_id, c.name as client_name
from content_items ci
join clients c on c.id = ci.client_id
where ci.agency_id = 'ag-2'
  and c.agency_id != 'ag-2';

-- 7. CRITICAL: No shoot from ag-1 references an ag-2 client
select
  'LEAK — ag-1 shoot → ag-2 client' as check_name,
  s.id, s.title, s.agency_id, c.id as client_id, c.name as client_name
from shoots s
join clients c on c.id = s.client_id
where s.agency_id = 'ag-1'
  and c.agency_id != 'ag-1';

-- 8. CRITICAL: No shoot_item references content from wrong agency
select
  'LEAK — shoot_item cross-agency' as check_name,
  si.shoot_id, si.content_item_id
from shoot_items si
join shoots s on s.id = si.shoot_id
join content_items ci on ci.id = si.content_item_id
where s.agency_id != ci.agency_id;

-- 9. CRITICAL: No deliverable_version references content from wrong agency
select
  'LEAK — deliverable cross-agency' as check_name,
  dv.id, dv.agency_id, ci.agency_id as content_agency
from deliverable_versions dv
join content_items ci on ci.id = dv.content_item_id
where dv.agency_id != ci.agency_id;

-- 10. Jaspreet (u-2) sees exactly her 2 clients
select
  'Jaspreet client count' as check_name,
  count(*) as cnt
from clients
where manager_id = 'u-2'
having count(*) != 2;

-- 11. Jaspreet's clients are Ramana Dental and Grover Motors
select
  'Jaspreet client names' as check_name,
  string_agg(name, ', ' order by name) as names
from clients
where manager_id = 'u-2'
  and name not in ('Ramana Dental', 'Grover Motors')
having count(*) > 0;

-- 12. Each table has both ag-1 and ag-2 rows (where applicable)
select
  'agency_coverage' as check_name,
  table_name,
  count(*) filter (where agency_id = 'ag-1') as ag_1,
  count(*) filter (where agency_id = 'ag-2') as ag_2
from (
  select 'users' as table_name, agency_id from users
  union all select 'clients', agency_id from clients
  union all select 'content_items', agency_id from content_items
  union all select 'shoots', agency_id from shoots
  union all select 'upload_sessions', agency_id from upload_sessions
  union all select 'raw_files', agency_id from raw_files
  union all select 'deliverable_versions', agency_id from deliverable_versions
  union all select 'comments', agency_id from comments
  union all select 'post_schedule', agency_id from post_schedule
  union all select 'library_assets', agency_id from library_assets
  union all select 'activity_log', agency_id from activity_log
  union all select 'notifications', agency_id from notifications
  union all select 'drive_sync_state', agency_id from drive_sync_state
) t
group by table_name
having count(*) filter (where agency_id = 'ag-1') = 0
    or count(*) filter (where agency_id = 'ag-2') = 0;
