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

-- ── Notification text names the client and the idea (re-declared from 006 / 009) ──
create or replace function phase4_arrival(p_shoot_id text,p_actor_id text,p_source text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_shoot shoots%rowtype; v_client clients%rowtype; v_link shoot_items%rowtype; v_item content_items%rowtype;
  v_count integer; v_arrived integer; v_user_id text;
begin
  select * into v_shoot from shoots where id=p_shoot_id for update;
  if v_shoot.id is null then raise exception 'Shoot not found'; end if;
  select * into v_client from clients where id=v_shoot.client_id;
  select count(*), count(*) filter(where raw_uploaded_at is not null or exists(
    select 1 from raw_files r where r.shoot_id=p_shoot_id and r.content_item_id=shoot_items.content_item_id))
    into v_count,v_arrived from shoot_items where shoot_id=p_shoot_id;
  if v_count=0 or v_arrived<v_count or v_shoot.status in ('raw_uploaded','cancelled') then return to_jsonb(v_shoot); end if;
  update shoots set status='raw_uploaded',raw_detected_at=now() where id=p_shoot_id returning * into v_shoot;
  insert into activity_log(id,agency_id,actor_id,actor_type,entity_type,entity_id,action,from_state,to_state,metadata)
    values(gen_random_uuid()::text,v_shoot.agency_id,p_actor_id,(case when p_actor_id is null then 'system' else 'user' end)::actor_type,
      'shoot',p_shoot_id,'raw_arrived','scheduled','raw_uploaded',jsonb_build_object('source',p_source));
  for v_link in select * from shoot_items where shoot_id=p_shoot_id loop
    select * into v_item from content_items where id=v_link.content_item_id;
    if v_item.status='shoot_scheduled' then
      perform phase3_transition(v_item.id,'raw_uploaded',coalesce(v_client.manager_id,v_shoot.created_by),'shoot_scheduled');
    end if;
    if v_item.assigned_editor_id is not null then
      insert into notifications(id,agency_id,user_id,type,title,body,link)
        values(gen_random_uuid()::text,v_shoot.agency_id,v_item.assigned_editor_id,'raw_arrived','Raw footage arrived',v_client.name||' · '||v_item.title,'/editor/todo');
    end if;
  end loop;
  if v_client.manager_id is not null then
    insert into notifications(id,agency_id,user_id,type,title,body,link)
      values(gen_random_uuid()::text,v_shoot.agency_id,v_client.manager_id,'raw_arrived','Shoot raw arrived',v_client.name||' · '||v_shoot.title,'/manager/calendar');
  end if;
  return to_jsonb(v_shoot);
end $$;

create or replace function phase6_review_decision(p_item_id text, p_actor_id text, p_decision text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_item content_items%rowtype;
  v_actor users%rowtype;
  v_client clients%rowtype;
  v_version deliverable_versions%rowtype;
  v_target content_status;
  v_unresolved integer;
begin
  if p_decision not in ('approve','changes') then raise exception 'Invalid decision'; end if;
  select * into v_item from content_items where id = p_item_id for update;
  select * into v_actor from users where id = p_actor_id and is_active;
  if v_item.id is null or v_actor.id is null then raise exception 'Forbidden'; end if;
  select * into v_client from clients where id = v_item.client_id;
  if v_actor.agency_id <> v_item.agency_id or v_actor.role not in ('admin','brand_manager')
    or (v_actor.role = 'brand_manager' and v_client.manager_id <> v_actor.id) then raise exception 'Forbidden'; end if;
  if v_item.status <> 'cut_submitted' then raise exception 'This cut is not waiting for review'; end if;
  select * into v_version from deliverable_versions where content_item_id = v_item.id order by version desc limit 1;
  if v_version.id is null then raise exception 'No cut has been submitted'; end if;
  if p_decision = 'changes' then
    select count(*) into v_unresolved from comments where version_id = v_version.id and resolved_at is null;
    if v_unresolved = 0 then raise exception 'Add at least one unresolved comment before sending changes'; end if;
    v_target := 'changes_requested';
  else
    v_target := 'internally_approved';
  end if;
  update content_items set status = v_target, updated_at = now() where id = v_item.id returning * into v_item;
  update deliverable_versions set status = case when p_decision = 'changes'
    then 'changes_requested'::version_status else 'internally_approved'::version_status end where id = v_version.id;
  insert into activity_log(id,agency_id,actor_id,actor_type,entity_type,entity_id,action,from_state,to_state,metadata)
    values(gen_random_uuid()::text,v_item.agency_id,p_actor_id,'user','content_item',v_item.id,
      'content_status_changed','cut_submitted',v_target::text,
      jsonb_build_object('version_id',v_version.id,'version',v_version.version,'source','internal_review'));
  if p_decision = 'changes' and v_item.assigned_editor_id is not null then
    insert into notifications(id,agency_id,user_id,type,title,body,link,actor_id)
      values(gen_random_uuid()::text,v_item.agency_id,v_item.assigned_editor_id,'revision',
        'Changes requested',v_client.name||' · '||v_item.title||' · v'||v_version.version,'/editor/redo',p_actor_id);
  end if;
  return to_jsonb(v_item);
end $$;

create or replace function phase6_reopen_item(p_item_id text, p_actor_id text, p_note text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_item content_items%rowtype;
  v_actor users%rowtype;
  v_client clients%rowtype;
  v_version deliverable_versions%rowtype;
begin
  if p_note is null or length(btrim(p_note)) = 0 then raise exception 'Describe the change that is needed'; end if;
  select * into v_item from content_items where id = p_item_id for update;
  select * into v_actor from users where id = p_actor_id and is_active;
  if v_item.id is null or v_actor.id is null then raise exception 'Forbidden'; end if;
  select * into v_client from clients where id = v_item.client_id;
  if v_actor.agency_id <> v_item.agency_id or v_actor.role not in ('admin','brand_manager')
    or (v_actor.role = 'brand_manager' and v_client.manager_id <> v_actor.id) then raise exception 'Forbidden'; end if;
  if v_item.status <> 'client_approved' then raise exception 'Only a client-approved item can be reopened'; end if;
  select * into v_version from deliverable_versions where content_item_id = v_item.id order by version desc limit 1;
  insert into comments(id,agency_id,version_id,author_id,author_label,body,source)
    values(gen_random_uuid()::text,v_item.agency_id,v_version.id,v_actor.id,v_actor.full_name,p_note,'internal');
  update content_items set status = 'client_changes', updated_at = now() where id = v_item.id returning * into v_item;
  update deliverable_versions set status = 'changes_requested' where id = v_version.id;
  insert into activity_log(id,agency_id,actor_id,actor_type,entity_type,entity_id,action,from_state,to_state,metadata)
    values(gen_random_uuid()::text,v_item.agency_id,p_actor_id,'user','content_item',v_item.id,
      'content_status_changed','client_approved','client_changes',
      jsonb_build_object('version_id',v_version.id,'source','reopened'));
  if v_item.assigned_editor_id is not null then
    insert into notifications(id,agency_id,user_id,type,title,body,link,actor_id)
      values(gen_random_uuid()::text,v_item.agency_id,v_item.assigned_editor_id,'revision',
        'Changes requested after approval',v_client.name||' · '||v_item.title,'/editor/redo',p_actor_id);
  end if;
  return to_jsonb(v_item);
end $$;

create or replace function phase6_client_respond(p_link_id text, p_response text, p_text text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_link approval_links%rowtype;
  v_item content_items%rowtype;
  v_client clients%rowtype;
  v_latest deliverable_versions%rowtype;
  v_target content_status;
begin
  if p_response not in ('approved','changes') then raise exception 'invalid'; end if;
  select * into v_link from approval_links where id = p_link_id for update;
  if v_link.id is null then raise exception 'invalid'; end if;
  if v_link.revoked_at is not null then raise exception 'revoked'; end if;
  if v_link.responded_at is not null then raise exception 'responded'; end if;
  if v_link.locked_at is not null then raise exception 'locked'; end if;
  if v_link.expires_at <= now() then raise exception 'expired'; end if;
  select * into v_item from content_items where id = v_link.content_item_id for update;
  select * into v_latest from deliverable_versions where content_item_id = v_item.id order by version desc limit 1;
  if v_item.status <> 'with_client' or v_latest.id is distinct from v_link.version_id then raise exception 'revoked'; end if;
  if p_response = 'changes' and (p_text is null or length(btrim(p_text)) = 0) then raise exception 'text_required'; end if;
  select * into v_client from clients where id = v_item.client_id;
  if p_response = 'approved' then
    v_target := 'client_approved';
  else
    v_target := 'client_changes';
    insert into comments(id,agency_id,version_id,author_id,author_label,body,source)
      values(gen_random_uuid()::text,v_link.agency_id,v_link.version_id,null,v_link.client_name,p_text,'client');
  end if;
  update approval_links set response = p_response, responded_at = now() where id = v_link.id;
  update content_items set status = v_target, updated_at = now() where id = v_item.id;
  update deliverable_versions set status = case when p_response = 'approved'
    then 'client_approved'::version_status else 'changes_requested'::version_status end where id = v_link.version_id;
  insert into activity_log(id,agency_id,actor_id,actor_type,entity_type,entity_id,action,from_state,to_state,metadata)
    values(gen_random_uuid()::text,v_link.agency_id,null,'client','content_item',v_item.id,
      'content_status_changed','with_client',v_target::text,
      jsonb_build_object('link_id',v_link.id,'version_id',v_link.version_id,'response',p_response));
  if v_client.manager_id is not null then
    insert into notifications(id,agency_id,user_id,type,title,body,link)
      values(gen_random_uuid()::text,v_link.agency_id,v_client.manager_id,'approval',
        case when p_response = 'approved' then 'Client approved' else 'Client requested changes' end,
        v_client.name||' · '||v_item.title,'/manager/den');
  end if;
  if p_response = 'changes' and v_item.assigned_editor_id is not null then
    insert into notifications(id,agency_id,user_id,type,title,body,link)
      values(gen_random_uuid()::text,v_link.agency_id,v_item.assigned_editor_id,'revision',
        'Client requested changes',v_client.name||' · '||v_item.title,'/editor/redo');
  end if;
  return jsonb_build_object('response',p_response);
end $$;

-- ── Staleness: what has been sitting too long ─────────────────────────────
-- Where a person should land for an area, by role.
create or replace function phase8_area_link(p_user text, p_area text) returns text
language sql stable set search_path = public as $$
  select case p_area
    when 'shoot'   then case u.role when 'cameraman' then '/cameraman/shoots' when 'admin' then '/admin/calendar' else '/manager/calendar' end
    when 'edit'    then case u.role when 'editor' then '/editor/redo' when 'admin' then '/admin/den' else '/manager/den' end
    when 'den'     then case u.role when 'admin' then '/admin/den' else '/manager/den' end
    when 'posting' then case u.role when 'admin' then '/admin/posting' else '/manager/posting' end
    when 'upload'  then case u.role when 'cameraman' then '/cameraman/upload' when 'admin' then '/admin/calendar' else '/manager/calendar' end
    when 'storage' then '/admin/settings'
    else '/' end
  from users u where u.id = p_user
$$;

-- Every condition that is true right now, one row per recipient. Pure read; the runner below applies the once-only rule.
create or replace function phase8_stale_candidates(p_now timestamptz)
returns table(agency_id text, kind text, entity_id text, threshold text, recipient text, notif_type text, title text, body text, link text)
language sql stable security definer set search_path = public as $$
  with raw as (
    -- 1. shoot ended over 24h ago and no raw detected
    select s.agency_id, 'shoot_no_raw'::text kind, s.id entity_id, '24h'::text threshold, 'shoot'::text area, 'stale'::text notif_type,
           'No raw footage after the shoot'::text title,
           c.name||' · '||s.title||' ended '||to_char(s.scheduled_end at time zone 'Asia/Kolkata','DD Mon, HH12:MI am') body,
           array[s.cameraman_id, c.manager_id] recipients
      from shoots s join clients c on c.id = s.client_id
     where s.status in ('scheduled','completed') and s.raw_detected_at is null
       and s.scheduled_end < p_now - interval '24 hours'
       and not exists (select 1 from raw_files rf where rf.shoot_id = s.id)
    union all
    -- 2. edit past its deadline
    select i.agency_id, 'edit_overdue', i.id, 'deadline', 'edit', 'stale', 'Edit is past its deadline',
           c.name||' · '||i.title||' was due '||to_char(i.deadline,'DD Mon'),
           array[i.assigned_editor_id, c.manager_id]
      from content_items i join clients c on c.id = i.client_id
     where i.status in ('with_editor','changes_requested','client_changes')
       and i.deadline < (p_now at time zone 'Asia/Kolkata')::date
    union all
    -- 3. cut waiting for review over 12h
    select i.agency_id, 'cut_waiting', i.id, '12h', 'den', 'stale', 'Cut waiting for review',
           c.name||' · '||i.title||' has been waiting over 12 hours', array[c.manager_id]
      from content_items i join clients c on c.id = i.client_id
     where i.status = 'cut_submitted' and i.updated_at < p_now - interval '12 hours'
    union all
    -- 4. item with the client over 48h
    select i.agency_id, 'client_waiting', i.id, '48h', 'den', 'stale', 'Client has not responded',
           c.name||' · '||i.title||' has been with the client over 48 hours', array[c.manager_id]
      from content_items i join clients c on c.id = i.client_id
     where i.status = 'with_client' and i.updated_at < p_now - interval '48 hours'
    union all
    -- 5. post past its time and unposted
    select p.agency_id, 'post_overdue', p.id, 'overdue', 'posting', 'stale', 'Post is overdue',
           c.name||' · '||i.title||' was due '||to_char(p.scheduled_at at time zone 'Asia/Kolkata','DD Mon, HH12:MI am'), array[c.manager_id]
      from post_schedule p join content_items i on i.id = p.content_item_id join clients c on c.id = i.client_id
     where p.posted_at is null and p.scheduled_at < p_now and i.status <> 'archived'
    union all
    -- 6. raw footage above 70% / 85% of the Drive pool (the highest crossed threshold only)
    select u.agency_id, 'storage', u.agency_id, case when u.used >= 0.85 * 2199023255552 then '85' else '70' end, 'storage', 'storage',
           'Drive storage is '||round(100.0 * u.used / 2199023255552)||'% full',
           'Raw footage uses '||round(u.used / 1073741824.0)||' GB of the 2 TB pool. Delete finished shoots in Settings.',
           array(select id from users a where a.agency_id = u.agency_id and a.role = 'admin' and a.is_active)
      from (select agency_id, coalesce(sum(size_bytes),0)::numeric used from raw_files group by agency_id) u
     where u.used >= 0.70 * 2199023255552
    union all
    -- 7. upload with no progress for over 24h
    select us.agency_id, 'upload_stalled', us.id, '24h', 'upload', 'stale', 'An upload has stalled',
           c.name||' · '||us.file_name||' has made no progress for over 24 hours', array[sh.cameraman_id, c.manager_id]
      from upload_sessions us join shoots sh on sh.id = us.shoot_id join clients c on c.id = sh.client_id
     where us.status = 'active' and coalesce(us.last_progress_at, us.created_at) < p_now - interval '24 hours'
    union all
    -- Event: a post is due today (IST)
    select p.agency_id, 'post_due', p.id, 'today', 'posting', 'post_due', 'Post due today',
           c.name||' · '||i.title||' at '||to_char(p.scheduled_at at time zone 'Asia/Kolkata','HH12:MI am'), array[c.manager_id]
      from post_schedule p join content_items i on i.id = p.content_item_id join clients c on c.id = i.client_id
     where p.posted_at is null and i.status = 'scheduled'
       and (p.scheduled_at at time zone 'Asia/Kolkata')::date = (p_now at time zone 'Asia/Kolkata')::date
  )
  select r.agency_id, r.kind, r.entity_id, r.threshold, x.recipient, r.notif_type, r.title, r.body, phase8_area_link(x.recipient, r.area)
    from raw r
    cross join lateral unnest(r.recipients) as x(recipient)
    join users u on u.id = x.recipient and u.is_active and u.agency_id = r.agency_id
   where x.recipient is not null
$$;

-- Runs the once-per-threshold rule, escalation and clearing in a single transaction.
create or replace function phase8_run_staleness(p_now timestamptz default now())
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_new integer := 0; v_escalated integer := 0; v_cleared integer := 0; v_key record; v_row record;
begin
  perform pg_advisory_xact_lock(80081);
  -- Resolved conditions are forgotten, so a later recurrence alerts afresh.
  with gone as (
    delete from alert_state a where not exists (
      select 1 from phase8_stale_candidates(p_now) c where c.kind = a.kind and c.entity_id = a.entity_id and c.threshold = a.threshold)
    returning 1)
  select count(*) into v_cleared from gone;

  for v_key in
    select distinct c.agency_id, c.kind, c.entity_id, c.threshold from phase8_stale_candidates(p_now) c
     where not exists (select 1 from alert_state a where a.kind = c.kind and a.entity_id = c.entity_id and a.threshold = c.threshold)
  loop
    insert into alert_state(agency_id,kind,entity_id,threshold,alerted_at) values(v_key.agency_id,v_key.kind,v_key.entity_id,v_key.threshold,p_now);
    for v_row in select * from phase8_stale_candidates(p_now) c
                  where c.kind = v_key.kind and c.entity_id = v_key.entity_id and c.threshold = v_key.threshold loop
      insert into notifications(id,agency_id,user_id,type,title,body,link)
        values(gen_random_uuid()::text,v_row.agency_id,v_row.recipient,v_row.notif_type,v_row.title,v_row.body,v_row.link);
    end loop;
    v_new := v_new + 1;
  end loop;

  -- A brand-manager alert still unresolved after 48 hours goes to the admins, once.
  for v_key in
    select a.agency_id, a.kind, a.entity_id, a.threshold from alert_state a
     where a.escalated_at is null and a.alerted_at < p_now - interval '48 hours' and a.kind not in ('storage','post_due')
       and exists (select 1 from phase8_stale_candidates(p_now) c where c.kind = a.kind and c.entity_id = a.entity_id and c.threshold = a.threshold)
  loop
    for v_row in select distinct c.title, c.body, c.agency_id from phase8_stale_candidates(p_now) c
                  where c.kind = v_key.kind and c.entity_id = v_key.entity_id and c.threshold = v_key.threshold limit 1 loop
      insert into notifications(id,agency_id,user_id,type,title,body,link)
        select gen_random_uuid()::text, v_row.agency_id, u.id, 'stale', 'Not actioned for 48 hours: '||v_row.title, v_row.body,
               phase8_area_link(u.id, case when v_key.kind like 'post%' then 'posting' when v_key.kind like 'shoot%' or v_key.kind = 'upload_stalled' then 'shoot' else 'den' end)
          from users u where u.agency_id = v_row.agency_id and u.role = 'admin' and u.is_active;
    end loop;
    update alert_state set escalated_at = p_now where kind = v_key.kind and entity_id = v_key.entity_id and threshold = v_key.threshold;
    v_escalated := v_escalated + 1;
  end loop;
  return jsonb_build_object('alerted', v_new, 'escalated', v_escalated, 'cleared', v_cleared);
end $$;

revoke all on function phase8_area_link(text,text) from public, anon, authenticated;
revoke all on function phase8_stale_candidates(timestamptz) from public, anon, authenticated;
revoke all on function phase8_run_staleness(timestamptz) from public, anon, authenticated;
grant execute on function phase8_area_link(text,text) to service_role;
grant execute on function phase8_stale_candidates(timestamptz) to service_role;
grant execute on function phase8_run_staleness(timestamptz) to service_role;

-- ── Client link views feed the "client link viewed" notification (first view only) ──
create or replace function phase6_record_view(p_link_id text, p_ip text, p_user_agent text)
returns void language plpgsql security definer set search_path = public as $$
declare v_link approval_links%rowtype;
begin
  select * into v_link from approval_links where id = p_link_id for update;
  if v_link.id is null then return; end if;
  insert into approval_link_views(agency_id,link_id,ip,user_agent) values(v_link.agency_id,v_link.id,p_ip,left(p_user_agent,512));
  if v_link.viewed_at is null then
    update approval_links set viewed_at = now() where id = v_link.id;
    insert into activity_log(id,agency_id,actor_id,actor_type,entity_type,entity_id,action,metadata)
      values(gen_random_uuid()::text,v_link.agency_id,null,'client','approval_link',v_link.id,'viewed',
        jsonb_build_object('content_item_id',v_link.content_item_id,'version_id',v_link.version_id));
  end if;
end $$;

revoke all on function phase4_arrival(text,text,text) from public, anon, authenticated;
revoke all on function phase6_review_decision(text,text,text) from public, anon, authenticated;
revoke all on function phase6_reopen_item(text,text,text) from public, anon, authenticated;
revoke all on function phase6_client_respond(text,text,text) from public, anon, authenticated;
revoke all on function phase6_record_view(text,text,text) from public, anon, authenticated;
grant execute on function phase4_arrival(text,text,text) to service_role;
grant execute on function phase6_review_decision(text,text,text) to service_role;
grant execute on function phase6_reopen_item(text,text,text) to service_role;
grant execute on function phase6_client_respond(text,text,text) to service_role;
grant execute on function phase6_record_view(text,text,text) to service_role;

-- ── Hourly scheduling (the job itself is created by scripts/schedule-staleness-cron.mjs once the app has a public URL) ──
create extension if not exists pg_cron;
create extension if not exists pg_net;
