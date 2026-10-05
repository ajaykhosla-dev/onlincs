-- Phase 8: notifications and nudges.
-- Notifications are written by database triggers, so every path that changes state (RPCs, cron, routes)
-- produces them the same way. Push delivery happens afterwards in the app (lib/push), driven by pushed_at.

-- ── Notifications: actor, batching and push bookkeeping ───────────────────
alter table notifications add column if not exists actor_id text references users(id);
alter table notifications add column if not exists batch_count integer not null default 1;
alter table notifications add column if not exists pushed_at timestamptz;
alter table notifications add column if not exists push_state text;
-- Everything that exists today is history, not a push waiting to be sent.
update notifications set pushed_at = now(), push_state = 'legacy' where pushed_at is null;
create index if not exists idx_notifications_user_created on notifications(user_id, created_at desc);
create index if not exists idx_notifications_unpushed on notifications(created_at) where pushed_at is null;

alter table push_subscriptions add column if not exists user_agent text;
alter table push_subscriptions add column if not exists last_used_at timestamptz;

-- ── Preferences ───────────────────────────────────────────────────────────
create table if not exists notification_prefs (
  user_id text primary key references users(id),
  agency_id text not null references agencies(id),
  categories jsonb not null default '{"shoots":true,"raw":true,"edits":true,"review":true,"posting":true,"alerts":true}'::jsonb,
  quiet_enabled boolean not null default true,
  quiet_start text not null default '22:00' check (quiet_start ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  quiet_end text not null default '08:00' check (quiet_end ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  updated_at timestamptz not null default now()
);
alter table notification_prefs enable row level security;
drop policy if exists notification_prefs_own on notification_prefs;
create policy notification_prefs_own on notification_prefs for all to authenticated
  using (user_id = auth_user_id()) with check (user_id = auth_user_id() and agency_id = auth_agency_id());

-- ── Staleness alert state: one row per item per threshold ─────────────────
create table if not exists alert_state (
  agency_id text not null references agencies(id),
  kind text not null,
  entity_id text not null,
  threshold text not null,
  alerted_at timestamptz not null default now(),
  escalated_at timestamptz,
  primary key (kind, entity_id, threshold)
);
create index if not exists idx_alert_state_agency on alert_state(agency_id);
alter table alert_state enable row level security;
revoke all on alert_state from anon, authenticated;

-- ── Never notify someone about their own action; fold bursts into one row ─
create or replace function phase8_notification_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_existing notifications%rowtype;
begin
  if new.actor_id is not null and new.actor_id = new.user_id then return null; end if;
  select * into v_existing from notifications
    where user_id = new.user_id and type = new.type and read_at is null
      and created_at > now() - interval '60 seconds'
    order by created_at desc limit 1 for update;
  if v_existing.id is not null then
    update notifications set
      batch_count = v_existing.batch_count + 1,
      title = regexp_replace(v_existing.title, ' · [0-9]+ updates$', '') || ' · ' || (v_existing.batch_count + 1) || ' updates',
      body = 'Latest: ' || coalesce(new.body, ''),
      link = coalesce(new.link, v_existing.link),
      created_at = now(), pushed_at = null, push_state = null
    where id = v_existing.id;
    return null;
  end if;
  return new;
end $$;
drop trigger if exists phase8_notification_guard_trigger on notifications;
create trigger phase8_notification_guard_trigger before insert on notifications
  for each row execute function phase8_notification_guard();

-- ── Events that listen to activity_log ────────────────────────────────────
create or replace function phase8_on_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_shoot shoots%rowtype;
  v_item content_items%rowtype;
  v_client clients%rowtype;
  v_editor text;
begin
  if new.entity_type = 'shoot' and new.action in ('created','updated') then
    select * into v_shoot from shoots where id = new.entity_id;
    if v_shoot.id is not null and v_shoot.cameraman_id is not null and v_shoot.status <> 'cancelled' then
      select * into v_client from clients where id = v_shoot.client_id;
      insert into notifications(id,agency_id,user_id,type,title,body,link,actor_id)
        values(gen_random_uuid()::text,v_shoot.agency_id,v_shoot.cameraman_id,'shoot_scheduled',
          case when new.action = 'created' then 'New shoot scheduled' else 'Shoot updated' end,
          v_client.name||' · '||v_shoot.title||' · '||to_char(v_shoot.scheduled_start at time zone 'Asia/Kolkata','DD Mon, HH12:MI am'),
          '/cameraman/shoots', new.actor_id);
    end if;
  elsif new.entity_type = 'content_item' and new.action in ('editor_assigned','editor_deadline_updated') then
    v_editor := new.metadata->>'new_editor_id';
    select * into v_item from content_items where id = new.entity_id;
    if v_editor is not null and v_item.id is not null then
      select * into v_client from clients where id = v_item.client_id;
      insert into notifications(id,agency_id,user_id,type,title,body,link,actor_id)
        values(gen_random_uuid()::text,v_item.agency_id,v_editor,'edit_assigned','Edit assigned',
          v_client.name||' · '||v_item.title||coalesce(' · due '||to_char(v_item.deadline,'DD Mon'),''),'/editor/todo',new.actor_id);
    end if;
  elsif new.entity_type = 'content_item' and new.action = 'cut_submitted' then
    select * into v_item from content_items where id = new.entity_id;
    if v_item.id is not null then
      select * into v_client from clients where id = v_item.client_id;
      if v_client.manager_id is not null then
        insert into notifications(id,agency_id,user_id,type,title,body,link,actor_id)
          values(gen_random_uuid()::text,v_item.agency_id,v_client.manager_id,'cut_submitted','Cut ready for review',
            v_client.name||' · '||v_item.title||' · v'||coalesce(new.metadata->>'version','1'),'/manager/den',new.actor_id);
      end if;
    end if;
  elsif new.entity_type = 'approval_link' and new.action = 'viewed' then
    select * into v_item from content_items where id = new.metadata->>'content_item_id';
    if v_item.id is not null then
      select * into v_client from clients where id = v_item.client_id;
      if v_client.manager_id is not null then
        insert into notifications(id,agency_id,user_id,type,title,body,link)
          values(gen_random_uuid()::text,v_item.agency_id,v_client.manager_id,'link_viewed','Client opened the link',
            v_client.name||' · '||v_item.title,'/manager/den');
      end if;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists phase8_on_activity_trigger on activity_log;
create trigger phase8_on_activity_trigger after insert on activity_log
  for each row execute function phase8_on_activity();
