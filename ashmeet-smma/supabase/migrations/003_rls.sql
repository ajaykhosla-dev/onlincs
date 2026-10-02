-- Migration: 003_rls
-- Phase 0: Row Level Security policies on all tables
-- Uses helper functions: auth_agency_id() and user_role()

-- ── Helper functions ─────────────────────────────────────────────────────

create or replace function auth_agency_id()
returns text
language sql stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::json->>'agency_id', '')
$$;

create or replace function user_role()
returns text
language sql stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::json->>'role', '')
$$;

create or replace function is_admin()
returns boolean
language sql stable
as $$
  select user_role() in ('platform_owner', 'admin')
$$;

-- ── Enable RLS on all tables ─────────────────────────────────────────────

alter table agencies              enable row level security;
alter table agency_integrations   enable row level security;
alter table users                 enable row level security;
alter table clients               enable row level security;
alter table client_scope          enable row level security;
alter table content_items         enable row level security;
alter table monthly_plans         enable row level security;
alter table shoots                enable row level security;
alter table shoot_items           enable row level security;
alter table upload_sessions       enable row level security;
alter table raw_files             enable row level security;
alter table deliverable_versions  enable row level security;
alter table comments              enable row level security;
alter table approval_links        enable row level security;
alter table post_schedule         enable row level security;
alter table library_assets        enable row level security;
alter table activity_log          enable row level security;
alter table drive_sync_state      enable row level security;
alter table push_subscriptions    enable row level security;
alter table notifications         enable row level security;

-- ── Agencies ─────────────────────────────────────────────────────────────

create policy "platform_owner manages agencies" on agencies
  for all using (is_admin());

-- ── Users ─────────────────────────────────────────────────────────────────

create policy "users see own agency" on users
  for select using (agency_id = auth_agency_id());

create policy "admin manages users" on users
  for insert with check (is_admin() and agency_id = auth_agency_id());

create policy "admin updates users" on users
  for update using (is_admin());

-- ── Clients ──────────────────────────────────────────────────────────────

create policy "admin sees all clients" on clients
  for select using (is_admin() and agency_id = auth_agency_id());

create policy "brand_manager sees own clients" on clients
  for select using (
    agency_id = auth_agency_id()
    and manager_id in (
      select id from users where agency_id = auth_agency_id() and email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

create policy "read_only sees own client" on clients
  for select using (agency_id = auth_agency_id());

-- ── Content Items ─────────────────────────────────────────────────────────

create policy "admin manages content" on content_items
  for all using (is_admin() and agency_id = auth_agency_id());

create policy "brand_manager manages client content" on content_items
  for all using (
    agency_id = auth_agency_id()
    and client_id in (
      select id from clients where agency_id = auth_agency_id()
        and manager_id in (select id from users where agency_id = auth_agency_id() and email = current_setting('request.jwt.claims', true)::json->>'email')
    )
  );

create policy "editor reads own assignments" on content_items
  for select using (
    agency_id = auth_agency_id()
    and (
      assigned_editor_id in (
        select id from users where agency_id = auth_agency_id() and email = current_setting('request.jwt.claims', true)::json->>'email'
      )
      or exists (
        select 1 from shoot_items si
        join shoots s on s.id = si.shoot_id
        where si.content_item_id = content_items.id
          and s.cameraman_id in (
            select id from users where agency_id = auth_agency_id() and email = current_setting('request.jwt.claims', true)::json->>'email'
          )
      )
    )
  );

-- ── Shoots ────────────────────────────────────────────────────────────────

create policy "admin manages shoots" on shoots
  for all using (is_admin() and agency_id = auth_agency_id());

create policy "brand_manager manages client shoots" on shoots
  for all using (
    agency_id = auth_agency_id()
    and client_id in (
      select id from clients where agency_id = auth_agency_id()
        and manager_id in (select id from users where agency_id = auth_agency_id() and email = current_setting('request.jwt.claims', true)::json->>'email')
    )
  );

create policy "cameraman sees own shoots" on shoots
  for all using (
    agency_id = auth_agency_id()
    and cameraman_id in (
      select id from users where agency_id = auth_agency_id() and email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

-- ── Shoot Items ───────────────────────────────────────────────────────────

create policy "shoot items visible via shoot" on shoot_items
  for all using (
    shoot_id in (
      select id from shoots where agency_id = auth_agency_id()
    )
  );

-- ── Upload Sessions ──────────────────────────────────────────────────────

create policy "admin manages upload_sessions" on upload_sessions
  for all using (is_admin() and agency_id = auth_agency_id());

create policy "cameraman owns upload_session" on upload_sessions
  for select using (
    agency_id = auth_agency_id()
    and started_by in (
      select id from users where agency_id = auth_agency_id() and email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

-- session_uri_enc must NEVER be readable — column-level exclusion
create policy "no one reads session_uri_enc" on upload_sessions
  for select using (false);

-- ── Raw Files ─────────────────────────────────────────────────────────────

create policy "raw_files visible to shoot team" on raw_files
  for select using (
    agency_id = auth_agency_id()
    and (
      exists (select 1 from shoots s where s.id = raw_files.shoot_id and s.cameraman_id in (
        select id from users where agency_id = auth_agency_id() and email = current_setting('request.jwt.claims', true)::json->>'email'
      ))
      or exists (select 1 from shoots s where s.id = raw_files.shoot_id and s.client_id in (
        select id from clients where agency_id = auth_agency_id()
          and manager_id in (select id from users where agency_id = auth_agency_id() and email = current_setting('request.jwt.claims', true)::json->>'email')
      ))
      or is_admin()
    )
  );

-- ── Deliverable Versions ──────────────────────────────────────────────────

create policy "admin manages deliverables" on deliverable_versions
  for all using (is_admin() and agency_id = auth_agency_id());

create policy "brand_manager manages client deliverables" on deliverable_versions
  for all using (
    agency_id = auth_agency_id()
    and content_item_id in (
      select ci.id from content_items ci
      join clients c on c.id = ci.client_id
      where ci.agency_id = auth_agency_id()
        and c.manager_id in (select id from users where agency_id = auth_agency_id() and email = current_setting('request.jwt.claims', true)::json->>'email')
    )
  );

create policy "editor manages own deliverables" on deliverable_versions
  for all using (
    agency_id = auth_agency_id()
    and uploaded_by in (
      select id from users where agency_id = auth_agency_id() and email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

-- ── Comments ──────────────────────────────────────────────────────────────

create policy "comments visible to item team" on comments
  for all using (
    agency_id = auth_agency_id()
    and (
      version_id in (
        select dv.id from deliverable_versions dv
        where dv.agency_id = auth_agency_id()
          and (
            exists (select 1 from content_items ci where ci.id = dv.content_item_id and ci.client_id in (
              select id from clients where agency_id = auth_agency_id()
                and manager_id in (select id from users where agency_id = auth_agency_id() and email = current_setting('request.jwt.claims', true)::json->>'email')
            ))
            or exists (select 1 from deliverable_versions dv2 where dv2.id = dv.id and dv2.uploaded_by in (
              select id from users where agency_id = auth_agency_id() and email = current_setting('request.jwt.claims', true)::json->>'email'
            ))
          )
      )
      or is_admin()
    )
  );

-- ── Approval Links ────────────────────────────────────────────────────────

create policy "admin manages approval_links" on approval_links
  for all using (is_admin() and agency_id = auth_agency_id());

create policy "brand_manager manages client approvals" on approval_links
  for all using (
    agency_id = auth_agency_id()
    and content_item_id in (
      select ci.id from content_items ci
      join clients c on c.id = ci.client_id
      where ci.agency_id = auth_agency_id()
        and c.manager_id in (select id from users where agency_id = auth_agency_id() and email = current_setting('request.jwt.claims', true)::json->>'email')
    )
  );

-- ── Post Schedule ─────────────────────────────────────────────────────────

create policy "admin manages schedule" on post_schedule
  for all using (is_admin() and agency_id = auth_agency_id());

create policy "brand_manager manages client schedule" on post_schedule
  for all using (
    agency_id = auth_agency_id()
    and content_item_id in (
      select ci.id from content_items ci
      join clients c on c.id = ci.client_id
      where ci.agency_id = auth_agency_id()
        and c.manager_id in (select id from users where agency_id = auth_agency_id() and email = current_setting('request.jwt.claims', true)::json->>'email')
    )
  );

-- ── Client Scope ──────────────────────────────────────────────────────────

create policy "admin manages scope" on client_scope
  for all using (is_admin() and agency_id = auth_agency_id());

create policy "brand_manager reads own scope" on client_scope
  for select using (
    agency_id = auth_agency_id()
    and client_id in (
      select id from clients where agency_id = auth_agency_id()
        and manager_id in (select id from users where agency_id = auth_agency_id() and email = current_setting('request.jwt.claims', true)::json->>'email')
    )
  );

-- ── Monthly Plans ─────────────────────────────────────────────────────────

create policy "admin manages plans" on monthly_plans
  for all using (is_admin() and agency_id = auth_agency_id());

create policy "brand_manager manages own plans" on monthly_plans
  for all using (
    agency_id = auth_agency_id()
    and client_id in (
      select id from clients where agency_id = auth_agency_id()
        and manager_id in (select id from users where agency_id = auth_agency_id() and email = current_setting('request.jwt.claims', true)::json->>'email')
    )
  );

-- ── Library Assets ────────────────────────────────────────────────────────

create policy "admin manages library" on library_assets
  for all using (is_admin() and agency_id = auth_agency_id());

create policy "brand_manager manages client library" on library_assets
  for all using (
    agency_id = auth_agency_id()
    and client_id in (
      select id from clients where agency_id = auth_agency_id()
        and manager_id in (select id from users where agency_id = auth_agency_id() and email = current_setting('request.jwt.claims', true)::json->>'email')
    )
  );

create policy "editor reads client library" on library_assets
  for select using (agency_id = auth_agency_id());

-- ── Activity Log ──────────────────────────────────────────────────────────

create policy "activity log for agency" on activity_log
  for all using (agency_id = auth_agency_id());

-- ── Drive Sync State ──────────────────────────────────────────────────────

create policy "admin manages sync" on drive_sync_state
  for all using (is_admin());

-- ── Push Subscriptions ────────────────────────────────────────────────────

create policy "user manages own subscription" on push_subscriptions
  for all using (
    agency_id = auth_agency_id()
    and user_id in (
      select id from users where agency_id = auth_agency_id() and email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );

-- ── Notifications ─────────────────────────────────────────────────────────

create policy "user sees own notifications" on notifications
  for all using (
    agency_id = auth_agency_id()
    and user_id in (
      select id from users where agency_id = auth_agency_id() and email = current_setting('request.jwt.claims', true)::json->>'email'
    )
  );
