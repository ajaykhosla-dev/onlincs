-- Phase 11: RapidArc platform console. Agency profile and lifecycle, per-agency credential metadata,
-- support (view-as-agency) sessions, and a transactional agency onboarding function.

-- ── Agency profile and lifecycle ──────────────────────────────────────────
alter table agencies add column if not exists display_name text;
alter table agencies add column if not exists phone text;
alter table agencies add column if not exists address text;
alter table agencies add column if not exists services text;
alter table agencies add column if not exists notes text;
alter table agencies add column if not exists plan text not null default 'standard';
alter table agencies add column if not exists suspended_at timestamptz;
alter table agencies add column if not exists suspended_reason text;

-- ── Credentials: a new agency starts with an empty row; only fingerprints are ever readable ──
alter table agency_integrations alter column drive_service_account_email drop not null;
alter table agency_integrations alter column drive_service_account_key_enc drop not null;
alter table agency_integrations alter column shared_drive_id drop not null;
alter table agency_integrations add column if not exists drive_key_fingerprint text;
alter table agency_integrations add column if not exists b2_key_id_last4 text;
alter table agency_integrations add column if not exists b2_app_key_last4 text;
alter table agency_integrations add column if not exists b2_endpoint text;
alter table agency_integrations add column if not exists b2_region text;
alter table agency_integrations add column if not exists last_test jsonb;
alter table agency_integrations add column if not exists last_test_at timestamptz;
-- Still unreachable through the public API (RLS on, no policies, no grants).
alter table agency_integrations enable row level security;
revoke all on agency_integrations from anon, authenticated;

-- ── Support access ────────────────────────────────────────────────────────
create table if not exists support_sessions (
  id text primary key default gen_random_uuid()::text,
  platform_user_id text not null references users(id),
  agency_id text not null references agencies(id),
  reason text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  end_reason text,
  elevated_at timestamptz,
  elevated_until timestamptz
);
create index if not exists idx_support_sessions_user on support_sessions(platform_user_id, ended_at);
create index if not exists idx_support_sessions_agency on support_sessions(agency_id, started_at);
alter table support_sessions enable row level security;
revoke all on support_sessions from anon, authenticated;

-- ── Onboarding: agency row, empty integrations row and the admin's invite record, in one transaction ──
create or replace function phase11_create_agency(
  p_actor text, p_name text, p_slug text, p_plan text, p_phone text, p_address text, p_services text, p_notes text,
  p_admin_email text, p_admin_name text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_actor users%rowtype; v_agency_id text; v_user_id text; v_initials text;
begin
  select * into v_actor from users where id = p_actor and is_active and role = 'platform_owner';
  if v_actor.id is null then raise exception 'Forbidden'; end if;
  if p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'Use lowercase letters, numbers and hyphens for the short name'; end if;
  if exists (select 1 from agencies where slug = p_slug) then raise exception 'That short name is already taken'; end if;
  if exists (select 1 from users where lower(email) = lower(p_admin_email)) then raise exception 'That email already belongs to a user'; end if;
  v_agency_id := 'ag-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
  v_user_id := 'u-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
  v_initials := upper(left(regexp_replace(p_admin_name, '[^A-Za-z ]', '', 'g'), 1) || coalesce(left(split_part(btrim(p_admin_name), ' ', 2), 1), ''));
  insert into agencies(id, name, slug, status, plan, display_name, phone, address, services, notes)
    values(v_agency_id, p_name, p_slug, 'trial', coalesce(nullif(p_plan,''),'standard'), p_name, p_phone, p_address, p_services, p_notes);
  insert into agency_integrations(agency_id) values(v_agency_id);
  insert into users(id, agency_id, email, full_name, initials, role, avatar_gradient, is_active)
    values(v_user_id, v_agency_id, lower(p_admin_email), p_admin_name, coalesce(nullif(v_initials,''),'AD'), 'admin',
           'linear-gradient(140deg,#8F80F7,#5A4AD8)', true);
  insert into activity_log(id, agency_id, actor_id, actor_type, entity_type, entity_id, action, metadata)
    values(gen_random_uuid()::text, v_agency_id, p_actor, 'user', 'platform', v_agency_id, 'agency_created',
           jsonb_build_object('name', p_name, 'slug', p_slug, 'admin_user_id', v_user_id));
  return jsonb_build_object('agency_id', v_agency_id, 'user_id', v_user_id);
end $$;

-- Suspension blocks sign-in for the whole agency and destroys nothing.
create or replace function phase11_set_agency_status(p_actor text, p_agency text, p_status text, p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_actor users%rowtype; v_old text;
begin
  select * into v_actor from users where id = p_actor and is_active and role = 'platform_owner';
  if v_actor.id is null then raise exception 'Forbidden'; end if;
  if p_status not in ('active','suspended','trial') then raise exception 'Invalid status'; end if;
  select status into v_old from agencies where id = p_agency for update;
  if v_old is null then raise exception 'Agency not found'; end if;
  if p_agency = v_actor.agency_id and p_status = 'suspended' then raise exception 'You cannot suspend the platform agency'; end if;
  update agencies set status = p_status,
    suspended_at = case when p_status = 'suspended' then now() else null end,
    suspended_reason = case when p_status = 'suspended' then p_reason else null end where id = p_agency;
  insert into activity_log(id, agency_id, actor_id, actor_type, entity_type, entity_id, action, from_state, to_state, metadata)
    values(gen_random_uuid()::text, p_agency, p_actor, 'user', 'platform', p_agency,
           case when p_status = 'suspended' then 'agency_suspended' else 'agency_reactivated' end, v_old, p_status,
           jsonb_build_object('reason', p_reason));
  return jsonb_build_object('status', p_status);
end $$;

revoke all on function phase11_create_agency(text,text,text,text,text,text,text,text,text,text) from public, anon, authenticated;
revoke all on function phase11_set_agency_status(text,text,text,text) from public, anon, authenticated;
grant execute on function phase11_create_agency(text,text,text,text,text,text,text,text,text,text) to service_role;
grant execute on function phase11_set_agency_status(text,text,text,text) to service_role;
