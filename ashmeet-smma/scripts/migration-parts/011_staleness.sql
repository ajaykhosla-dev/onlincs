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
