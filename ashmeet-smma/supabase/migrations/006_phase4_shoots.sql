-- Phase 4: atomic shoot scheduling and durable asynchronous Drive provisioning.
create table if not exists shoot_folder_jobs (
  shoot_id text primary key references shoots(id) on delete cascade,
  agency_id text not null references agencies(id),
  status text not null default 'pending' check (status in ('pending','running','complete','failed')),
  attempts integer not null default 0,
  last_error text,
  updated_at timestamptz not null default now()
);
create index if not exists idx_shoot_folder_jobs_pending on shoot_folder_jobs(status, updated_at);
alter table shoot_folder_jobs enable row level security;
alter table upload_sessions add column if not exists last_progress_at timestamptz;
update upload_sessions set last_progress_at=created_at where last_progress_at is null;
-- Seed cursors are placeholders, not tokens issued by Drive.
update drive_sync_state set page_token=null,last_polled_at=null
  where page_token like 'page-token-%' or page_token='seed-token';

create or replace function phase4_create_shoot(p_data jsonb, p_item_ids text[], p_actor_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_actor users%rowtype;
  v_client clients%rowtype;
  v_cam users%rowtype;
  v_shoot shoots%rowtype;
  v_item content_items%rowtype;
  v_item_id text;
  v_start timestamptz := (p_data->>'scheduled_start')::timestamptz;
  v_end timestamptz := (p_data->>'scheduled_end')::timestamptz;
begin
  select * into v_actor from users where id=p_actor_id and is_active;
  select * into v_client from clients where id=p_data->>'client_id';
  select * into v_cam from users where id=p_data->>'cameraman_id' and is_active and role='cameraman';
  if v_actor.id is null or v_client.id is null or v_cam.id is null
     or v_actor.agency_id <> v_client.agency_id or v_cam.agency_id <> v_client.agency_id
     or v_actor.role not in ('admin','brand_manager')
     or (v_actor.role='brand_manager' and v_client.manager_id <> v_actor.id) then raise exception 'Forbidden'; end if;
  if v_start is null or v_end is null or v_end <= v_start then raise exception 'End time must follow start time'; end if;
  if coalesce(array_length(p_item_ids,1),0) = 0 then raise exception 'Choose at least one content item'; end if;
  insert into shoots(id,agency_id,client_id,title,scheduled_start,scheduled_end,location,cameraman_id,status,created_by)
    values(gen_random_uuid()::text,v_client.agency_id,v_client.id,p_data->>'title',v_start,v_end,
      p_data->>'location',v_cam.id,'scheduled',p_actor_id) returning * into v_shoot;
  foreach v_item_id in array p_item_ids loop
    select * into v_item from content_items where id=v_item_id for update;
    if v_item.id is null or v_item.client_id <> v_client.id or v_item.agency_id <> v_client.agency_id
       or v_item.status in ('planned','archived') then raise exception 'Invalid or unapproved content item %',v_item_id; end if;
    insert into shoot_items(shoot_id,content_item_id,idea_slug) values(v_shoot.id,v_item.id,v_item.slug)
      on conflict do nothing;
    if v_item.status='calendar_approved' then
      perform phase3_transition(v_item.id,'shoot_scheduled',p_actor_id,'calendar_approved');
    end if;
  end loop;
  insert into shoot_folder_jobs(shoot_id,agency_id) values(v_shoot.id,v_shoot.agency_id);
  insert into activity_log(id,agency_id,actor_id,actor_type,entity_type,entity_id,action,metadata)
    values(gen_random_uuid()::text,v_shoot.agency_id,p_actor_id,'user','shoot',v_shoot.id,'created',p_data);
  return to_jsonb(v_shoot);
end $$;

create or replace function phase4_add_shoot_item(p_shoot_id text,p_item_id text,p_actor_id text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_shoot shoots%rowtype; v_client clients%rowtype; v_actor users%rowtype; v_item content_items%rowtype;
begin
  select * into v_shoot from shoots where id=p_shoot_id for update;
  select * into v_client from clients where id=v_shoot.client_id;
  select * into v_actor from users where id=p_actor_id and is_active;
  select * into v_item from content_items where id=p_item_id for update;
  if v_shoot.id is null or v_shoot.status='cancelled' or v_actor.id is null or v_item.id is null or v_item.client_id<>v_shoot.client_id
    or v_actor.agency_id<>v_shoot.agency_id or v_actor.role not in ('admin','brand_manager')
    or (v_actor.role='brand_manager' and v_client.manager_id<>v_actor.id)
    or v_item.status in ('planned','archived') then raise exception 'Forbidden or unapproved item'; end if;
  insert into shoot_items(shoot_id,content_item_id,idea_slug) values(p_shoot_id,p_item_id,v_item.slug)
    on conflict do nothing;
  if v_item.status='calendar_approved' then
    perform phase3_transition(v_item.id,'shoot_scheduled',p_actor_id,'calendar_approved');
  end if;
  insert into shoot_folder_jobs(shoot_id,agency_id,status,updated_at)
    values(p_shoot_id,v_shoot.agency_id,'pending',now())
    on conflict(shoot_id) do update set status='pending',updated_at=now();
  insert into activity_log(id,agency_id,actor_id,actor_type,entity_type,entity_id,action,metadata)
    values(gen_random_uuid()::text,v_shoot.agency_id,p_actor_id,'user','shoot',p_shoot_id,'item_added',jsonb_build_object('content_item_id',p_item_id));
  return to_jsonb(v_item);
end $$;

create or replace function phase4_update_shoot(p_shoot_id text,p_data jsonb,p_actor_id text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_shoot shoots%rowtype; v_client clients%rowtype; v_actor users%rowtype; v_cam users%rowtype;
  v_start timestamptz := (p_data->>'scheduled_start')::timestamptz;
  v_end timestamptz := (p_data->>'scheduled_end')::timestamptz;
begin
  select * into v_shoot from shoots where id=p_shoot_id for update;
  select * into v_client from clients where id=v_shoot.client_id;
  select * into v_actor from users where id=p_actor_id and is_active;
  select * into v_cam from users where id=p_data->>'cameraman_id' and is_active and role='cameraman';
  if v_shoot.id is null or v_actor.id is null or v_cam.id is null or v_actor.agency_id<>v_shoot.agency_id
    or v_cam.agency_id<>v_shoot.agency_id or v_actor.role not in ('admin','brand_manager')
    or (v_actor.role='brand_manager' and v_client.manager_id<>v_actor.id) then raise exception 'Forbidden'; end if;
  if v_start is null or v_end is null or v_end<=v_start then raise exception 'End time must follow start time'; end if;
  update shoots set title=p_data->>'title',scheduled_start=v_start,scheduled_end=v_end,
    location=p_data->>'location',cameraman_id=v_cam.id where id=p_shoot_id returning * into v_shoot;
  insert into shoot_folder_jobs(shoot_id,agency_id,status,updated_at)
    values(p_shoot_id,v_shoot.agency_id,'pending',now())
    on conflict(shoot_id) do update set status='pending',updated_at=now();
  insert into activity_log(id,agency_id,actor_id,actor_type,entity_type,entity_id,action,metadata)
    values(gen_random_uuid()::text,v_shoot.agency_id,p_actor_id,'user','shoot',p_shoot_id,'updated',p_data);
  return to_jsonb(v_shoot);
end $$;

create or replace function phase4_cancel_shoot(p_shoot_id text,p_actor_id text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_shoot shoots%rowtype; v_client clients%rowtype; v_actor users%rowtype; v_previous text;
begin
  select * into v_shoot from shoots where id=p_shoot_id for update;
  select * into v_client from clients where id=v_shoot.client_id;
  select * into v_actor from users where id=p_actor_id and is_active;
  if v_shoot.id is null or v_actor.id is null or v_actor.agency_id<>v_shoot.agency_id
    or v_actor.role not in ('admin','brand_manager')
    or (v_actor.role='brand_manager' and v_client.manager_id<>v_actor.id) then raise exception 'Forbidden'; end if;
  if v_shoot.status<>'cancelled' then
    v_previous := v_shoot.status::text;
    update shoots set status='cancelled' where id=p_shoot_id returning * into v_shoot;
    insert into activity_log(id,agency_id,actor_id,actor_type,entity_type,entity_id,action,from_state,to_state)
      values(gen_random_uuid()::text,v_shoot.agency_id,p_actor_id,'user','shoot',p_shoot_id,'cancelled',v_previous,'cancelled');
  end if;
  return to_jsonb(v_shoot);
end $$;

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
        values(gen_random_uuid()::text,v_shoot.agency_id,v_item.assigned_editor_id,'raw_arrived','Raw footage arrived',v_item.title,'/editor/todo');
    end if;
  end loop;
  if v_client.manager_id is not null then
    insert into notifications(id,agency_id,user_id,type,title,body,link)
      values(gen_random_uuid()::text,v_shoot.agency_id,v_client.manager_id,'raw_arrived','Shoot raw arrived',v_shoot.title,'/manager/calendar');
  end if;
  return to_jsonb(v_shoot);
end $$;

create or replace function phase4_mark_raw(p_shoot_id text,p_item_id text,p_actor_id text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_shoot shoots%rowtype; v_client clients%rowtype; v_actor users%rowtype; v_link shoot_items%rowtype;
begin
  select * into v_shoot from shoots where id=p_shoot_id;
  select * into v_client from clients where id=v_shoot.client_id;
  select * into v_actor from users where id=p_actor_id and is_active;
  if v_shoot.id is null or v_actor.id is null or v_actor.agency_id<>v_shoot.agency_id
    or not (v_actor.role='admin' or v_actor.role='brand_manager' and v_client.manager_id=v_actor.id
      or v_actor.role='cameraman' and v_shoot.cameraman_id=v_actor.id) then raise exception 'Forbidden'; end if;
  select * into v_link from shoot_items where shoot_id=p_shoot_id and content_item_id=p_item_id for update;
  if v_link.shoot_id is null then raise exception 'Shoot item not found'; end if;
  if v_link.raw_uploaded_at is null then
    update shoot_items set raw_uploaded_at=now(),marked_by=p_actor_id where shoot_id=p_shoot_id and content_item_id=p_item_id;
    insert into activity_log(id,agency_id,actor_id,actor_type,entity_type,entity_id,action,metadata)
      values(gen_random_uuid()::text,v_shoot.agency_id,p_actor_id,'user','shoot_item',p_item_id,'manual_raw_mark',jsonb_build_object('shoot_id',p_shoot_id));
  end if;
  perform phase4_arrival(p_shoot_id,p_actor_id,'manual');
  return jsonb_build_object('marked',true);
end $$;

revoke all on function phase4_create_shoot(jsonb,text[],text) from public,anon,authenticated;
revoke all on function phase4_add_shoot_item(text,text,text) from public,anon,authenticated;
revoke all on function phase4_update_shoot(text,jsonb,text) from public,anon,authenticated;
revoke all on function phase4_cancel_shoot(text,text) from public,anon,authenticated;
revoke all on function phase4_arrival(text,text,text) from public,anon,authenticated;
revoke all on function phase4_mark_raw(text,text,text) from public,anon,authenticated;
grant execute on function phase4_create_shoot(jsonb,text[],text) to service_role;
grant execute on function phase4_add_shoot_item(text,text,text) to service_role;
grant execute on function phase4_update_shoot(text,jsonb,text) to service_role;
grant execute on function phase4_cancel_shoot(text,text) to service_role;
grant execute on function phase4_arrival(text,text,text) to service_role;
grant execute on function phase4_mark_raw(text,text,text) to service_role;
