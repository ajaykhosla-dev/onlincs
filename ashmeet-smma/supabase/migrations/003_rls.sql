-- Migration: 003_rls
-- Second wall behind lib/auth/can-access.ts. Identity comes from the JWT `sub`
-- (the users.id of the caller); agency and role are looked up in `users`, never
-- trusted from claims. Policies are additive (OR), so there are NO broad
-- catch-all policies: every grant below is scoped to the caller's role.

-- ── Identity helpers (security definer: they read users without recursing into its RLS) ──

create or replace function auth_user_id() returns text
language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')
$$;

create or replace function auth_agency_id() returns text
language sql stable security definer set search_path = public as $$
  select agency_id from users where id = auth_user_id() and is_active
$$;

create or replace function user_role() returns text
language sql stable security definer set search_path = public as $$
  select role from users where id = auth_user_id() and is_active
$$;

create or replace function is_platform_owner() returns boolean
language sql stable as $$ select coalesce(user_role() = 'platform_owner', false) $$;

-- admin of agency `a`, or platform owner (who crosses agencies)
create or replace function is_agency_admin(a text) returns boolean
language sql stable as $$
  select is_platform_owner() or (coalesce(user_role() = 'admin', false) and a = auth_agency_id())
$$;

-- ── Relationship helpers ──────────────────────────────────────────────────

create or replace function manages_client(cid text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from clients c where c.id = cid and c.manager_id = auth_user_id() and c.agency_id = auth_agency_id())
$$;

create or replace function editor_on_client(cid text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from content_items ci where ci.client_id = cid and ci.assigned_editor_id = auth_user_id() and ci.agency_id = auth_agency_id())
$$;

create or replace function cameraman_on_client(cid text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from shoots s where s.client_id = cid and s.cameraman_id = auth_user_id() and s.agency_id = auth_agency_id())
$$;

create or replace function cameraman_on_item(iid text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from shoot_items si join shoots s on s.id = si.shoot_id
    where si.content_item_id = iid and s.cameraman_id = auth_user_id() and s.agency_id = auth_agency_id())
$$;

-- admin, the client's manager, or the assigned editor (not cameramen)
create or replace function works_item(iid text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from content_items ci
    where ci.id = iid and (
      is_agency_admin(ci.agency_id)
      or (ci.agency_id = auth_agency_id() and (manages_client(ci.client_id) or ci.assigned_editor_id = auth_user_id()))))
$$;

create or replace function works_version(vid text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from deliverable_versions dv where dv.id = vid and works_item(dv.content_item_id))
$$;

revoke all on function auth_user_id(), auth_agency_id(), user_role(), is_platform_owner(), is_agency_admin(text),
  manages_client(text), editor_on_client(text), cameraman_on_client(text), cameraman_on_item(text),
  works_item(text), works_version(text) from public;
grant execute on function auth_user_id(), auth_agency_id(), user_role(), is_platform_owner(), is_agency_admin(text),
  manages_client(text), editor_on_client(text), cameraman_on_client(text), cameraman_on_item(text),
  works_item(text), works_version(text) to authenticated;

-- ── Enable RLS everywhere ─────────────────────────────────────────────────

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

-- anon gets nothing. authenticated gets table privileges narrowed below; RLS does the row filtering.
revoke all on all tables in schema public from anon;

-- Server-only tables: no policies and no privileges for any API role.
-- (The service role bypasses RLS and keeps its own grants.)
revoke all on agency_integrations, drive_sync_state from authenticated;

-- ── agencies ──────────────────────────────────────────────────────────────
create policy agencies_read on agencies for select to authenticated
  using (is_platform_owner() or id = auth_agency_id());
create policy agencies_write on agencies for all to authenticated
  using (is_platform_owner()) with check (is_platform_owner());

-- ── users ─────────────────────────────────────────────────────────────────
create policy users_read on users for select to authenticated
  using (is_platform_owner() or agency_id = auth_agency_id());
create policy users_admin_write on users for all to authenticated
  using (is_agency_admin(agency_id)) with check (is_agency_admin(agency_id));

-- ── clients ───────────────────────────────────────────────────────────────
create policy clients_read on clients for select to authenticated using (
  is_agency_admin(agency_id)
  or (agency_id = auth_agency_id() and (manages_client(id) or editor_on_client(id) or cameraman_on_client(id))));
create policy clients_admin_write on clients for all to authenticated
  using (is_agency_admin(agency_id)) with check (is_agency_admin(agency_id));
create policy clients_manager_update on clients for update to authenticated
  using (manages_client(id)) with check (manages_client(id));

-- ── client_scope ──────────────────────────────────────────────────────────
create policy scope_read on client_scope for select to authenticated
  using (is_agency_admin(agency_id) or manages_client(client_id));
create policy scope_admin_write on client_scope for all to authenticated
  using (is_agency_admin(agency_id)) with check (is_agency_admin(agency_id));

-- ── content_items ─────────────────────────────────────────────────────────
create policy items_read on content_items for select to authenticated using (
  works_item(id) or cameraman_on_item(id));
create policy items_insert on content_items for insert to authenticated with check (
  is_agency_admin(agency_id) or (agency_id = auth_agency_id() and manages_client(client_id)));
create policy items_update on content_items for update to authenticated
  using (works_item(id)) with check (works_item(id));
create policy items_delete on content_items for delete to authenticated using (
  is_agency_admin(agency_id) or (agency_id = auth_agency_id() and manages_client(client_id)));

-- ── monthly_plans ─────────────────────────────────────────────────────────
create policy plans_all on monthly_plans for all to authenticated
  using (is_agency_admin(agency_id) or manages_client(client_id))
  with check (is_agency_admin(agency_id) or manages_client(client_id));

-- ── shoots ────────────────────────────────────────────────────────────────
create policy shoots_read on shoots for select to authenticated using (
  is_agency_admin(agency_id) or manages_client(client_id)
  or (agency_id = auth_agency_id() and cameraman_id = auth_user_id()));
create policy shoots_write on shoots for all to authenticated
  using (is_agency_admin(agency_id) or manages_client(client_id))
  with check (is_agency_admin(agency_id) or manages_client(client_id));
create policy shoots_cameraman_update on shoots for update to authenticated
  using (agency_id = auth_agency_id() and cameraman_id = auth_user_id())
  with check (agency_id = auth_agency_id() and cameraman_id = auth_user_id());

-- ── shoot_items (no agency_id column; scoped through the parent shoot's own RLS) ──
create policy shoot_items_read on shoot_items for select to authenticated
  using (exists (select 1 from shoots s where s.id = shoot_items.shoot_id));
create policy shoot_items_write on shoot_items for all to authenticated
  using (exists (select 1 from shoots s where s.id = shoot_items.shoot_id))
  with check (exists (select 1 from shoots s where s.id = shoot_items.shoot_id));

-- ── upload_sessions: reads only, and never the session URI ────────────────
revoke all on upload_sessions from authenticated;
grant select (id, agency_id, shoot_id, content_item_id, file_name, file_size_bytes, mime_type,
              bytes_received, status, expires_at, started_by, completed_at, created_at)
  on upload_sessions to authenticated;
create policy sessions_read on upload_sessions for select to authenticated using (
  is_agency_admin(agency_id) or (agency_id = auth_agency_id() and started_by = auth_user_id()));
-- Created, advanced and read (with the URI) only by the server via the service role,
-- after canAccess() passes.

-- ── raw_files: read-only to API roles; the server writes ──────────────────
revoke insert, update, delete on raw_files from authenticated;
create policy raw_read on raw_files for select to authenticated using (
  is_agency_admin(agency_id)
  or (agency_id = auth_agency_id() and (
        exists (select 1 from shoots s where s.id = raw_files.shoot_id)
        or (content_item_id is not null and works_item(content_item_id)))));

-- ── deliverable_versions ──────────────────────────────────────────────────
create policy versions_all on deliverable_versions for all to authenticated
  using (works_item(content_item_id)) with check (works_item(content_item_id));

-- ── comments (version_id has no FK, so the join lives in works_version) ───
create policy comments_all on comments for all to authenticated
  using (works_version(version_id)) with check (works_version(version_id));

-- ── approval_links: hashes are never readable by API roles ────────────────
revoke all on approval_links from authenticated;
grant select (id, agency_id, content_item_id, version_id, expires_at, revoked_at, viewed_at,
              responded_at, response, client_name, created_by, created_at)
  on approval_links to authenticated;
create policy links_read on approval_links for select to authenticated
  using (works_item(content_item_id));

-- ── post_schedule ─────────────────────────────────────────────────────────
create policy schedule_all on post_schedule for all to authenticated using (
  is_agency_admin(agency_id) or exists (
    select 1 from content_items ci where ci.id = post_schedule.content_item_id and manages_client(ci.client_id)))
  with check (
  is_agency_admin(agency_id) or exists (
    select 1 from content_items ci where ci.id = post_schedule.content_item_id and manages_client(ci.client_id)));

-- ── library_assets ────────────────────────────────────────────────────────
create policy library_read on library_assets for select to authenticated using (
  is_agency_admin(agency_id) or manages_client(client_id) or editor_on_client(client_id));
create policy library_write on library_assets for all to authenticated
  using (is_agency_admin(agency_id) or manages_client(client_id))
  with check (is_agency_admin(agency_id) or manages_client(client_id));

-- ── activity_log: admins read; the server writes ──────────────────────────
revoke insert, update, delete on activity_log from authenticated;
create policy activity_read on activity_log for select to authenticated
  using (is_agency_admin(agency_id));

-- ── push_subscriptions / notifications: own rows only ─────────────────────
create policy push_own on push_subscriptions for all to authenticated
  using (user_id = auth_user_id()) with check (user_id = auth_user_id() and agency_id = auth_agency_id());
create policy notifications_own on notifications for all to authenticated
  using (user_id = auth_user_id()) with check (user_id = auth_user_id() and agency_id = auth_agency_id());
