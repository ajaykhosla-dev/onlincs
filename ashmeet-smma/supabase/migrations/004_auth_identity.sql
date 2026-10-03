-- Preserve seeded text IDs and their foreign keys; bind each workspace user to one Auth UUID.
alter table public.users add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null;

-- Workspace admins may edit users but may not assign or steal an Auth identity.
create or replace function public.protect_auth_user_link() returns trigger
language plpgsql as $$
begin
  if auth.role() = 'authenticated' then
    if tg_op = 'INSERT' and new.auth_user_id is not null then
      raise exception 'Auth identity links are managed by the server';
    end if;
    if tg_op = 'UPDATE' and new.auth_user_id is distinct from old.auth_user_id then
      raise exception 'Auth identity links are managed by the server';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_auth_user_link on public.users;
create trigger protect_auth_user_link before insert or update on public.users
for each row execute function public.protect_auth_user_link();

-- Existing Auth users, if any, are linked only when their email identifies exactly one active invite.
update public.users u set auth_user_id = a.id
from auth.users a
where lower(u.email) = lower(a.email)
  and u.is_active
  and (select count(*) from public.users x where lower(x.email) = lower(a.email) and x.is_active) = 1
  and u.auth_user_id is null;

create or replace function public.link_invited_auth_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.users u set auth_user_id = new.id
  where lower(u.email) = lower(new.email) and u.is_active
    and (select count(*) from public.users x where lower(x.email) = lower(new.email) and x.is_active) = 1;
  return new;
end;
$$;
drop trigger if exists link_invited_auth_user on auth.users;
create trigger link_invited_auth_user after insert on auth.users
for each row execute function public.link_invited_auth_user();

-- Enable this function as Auth > Hooks > Before User Created in Supabase.
create or replace function public.allow_invited_auth_user(event jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare matching_count integer;
begin
  select count(*) into matching_count from public.users
  where lower(email) = lower(event->'user'->>'email') and is_active;
  if matching_count = 1 then return '{}'::jsonb; end if;
  return jsonb_build_object('error', jsonb_build_object(
    'http_code', 403, 'message', 'This account isn''t part of a workspace yet'));
end;
$$;
revoke all on function public.allow_invited_auth_user(jsonb) from public, anon, authenticated;
grant execute on function public.allow_invited_auth_user(jsonb) to supabase_auth_admin;

-- Enable this function as Auth > Hooks > Custom Access Token in Supabase.
-- The app still checks the current users row on every request; claims are display context.
create or replace function public.workspace_access_token(event jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare person record; claims jsonb;
begin
  select id, agency_id, role into person from public.users
  where auth_user_id = (event->>'user_id')::uuid and is_active;
  claims := event->'claims';
  if found then
    claims := jsonb_set(claims, '{workspace_user_id}', to_jsonb(person.id));
    claims := jsonb_set(claims, '{agency_id}', to_jsonb(person.agency_id));
    claims := jsonb_set(claims, '{workspace_role}', to_jsonb(person.role));
  end if;
  return jsonb_build_object('claims', claims);
end;
$$;
revoke all on function public.workspace_access_token(jsonb) from public, anon, authenticated;
grant execute on function public.workspace_access_token(jsonb) to supabase_auth_admin;

-- Existing RLS policies compare to users.id (text). Resolve JWT sub through the UUID link.
create or replace function public.auth_user_id() returns text
language sql stable security definer set search_path = '' as $$
  select id from public.users
  where auth_user_id = (select auth.uid()) and is_active
$$;
revoke all on function public.auth_user_id() from public;
grant execute on function public.auth_user_id() to authenticated;
