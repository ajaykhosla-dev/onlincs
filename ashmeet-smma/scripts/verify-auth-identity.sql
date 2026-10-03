-- Run after 004_auth_identity.sql and scripts/provision-auth-users.ts --apply.
-- Both counts should be zero. The second query should return one row per active invite.
select 'active_invites_without_auth_link' as check_name, count(*) as failures
from public.users where is_active and auth_user_id is null;

select 'broken_auth_links' as check_name, count(*) as failures
from public.users u left join auth.users a on a.id = u.auth_user_id
where u.auth_user_id is not null and (a.id is null or lower(a.email) <> lower(u.email));

select u.id as workspace_user_id, u.email, u.role, u.agency_id,
       (u.auth_user_id is not null) as linked, a.email_confirmed_at is not null as auth_email_confirmed
from public.users u left join auth.users a on a.id = u.auth_user_id
where u.is_active order by u.agency_id, u.id;
