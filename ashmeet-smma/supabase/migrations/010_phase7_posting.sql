-- Phase 7: posting schedule. Scheduling, editing, marking posted and the 24-hour undo are transactional
-- and service-role only; route handlers authorize first and each function re-checks role and ownership.
-- Scope delivered is derived live from items at status 'posted', so these functions keep it accurate by
-- being the only path that moves an item to or from 'posted'.

alter table post_schedule add column if not exists updated_at timestamptz not null default now();
create unique index if not exists uq_post_schedule_item on post_schedule(content_item_id);
create index if not exists idx_post_schedule_agency_time on post_schedule(agency_id, scheduled_at);

create or replace function phase7_schedule_post(p_item_id text, p_actor_id text, p_scheduled_at timestamptz, p_caption text, p_music text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_item content_items%rowtype;
  v_actor users%rowtype;
  v_client clients%rowtype;
  v_post post_schedule%rowtype;
begin
  select * into v_item from content_items where id = p_item_id for update;
  select * into v_actor from users where id = p_actor_id and is_active;
  if v_item.id is null or v_actor.id is null then raise exception 'Forbidden'; end if;
  select * into v_client from clients where id = v_item.client_id;
  if v_actor.agency_id <> v_item.agency_id or v_actor.role not in ('admin','brand_manager')
    or (v_actor.role = 'brand_manager' and v_client.manager_id <> v_actor.id) then raise exception 'Forbidden'; end if;
  if v_item.status <> 'client_approved' then
    raise exception 'Only a client-approved item can be scheduled. This item is %', replace(v_item.status::text, '_', ' ');
  end if;
  if exists (select 1 from post_schedule where content_item_id = v_item.id) then
    raise exception 'This item already has a post on the schedule';
  end if;
  insert into post_schedule(id,agency_id,content_item_id,scheduled_at,caption,bg_music_ref)
    values(gen_random_uuid()::text,v_item.agency_id,v_item.id,p_scheduled_at,coalesce(p_caption,''),nullif(btrim(coalesce(p_music,'')),''))
    returning * into v_post;
  update content_items set status = 'scheduled', updated_at = now() where id = v_item.id;
  insert into activity_log(id,agency_id,actor_id,actor_type,entity_type,entity_id,action,from_state,to_state,metadata)
    values(gen_random_uuid()::text,v_item.agency_id,p_actor_id,'user','content_item',v_item.id,
      'content_status_changed','client_approved','scheduled',
      jsonb_build_object('post_id',v_post.id,'scheduled_at',p_scheduled_at));
  insert into activity_log(id,agency_id,actor_id,actor_type,entity_type,entity_id,action,metadata)
    values(gen_random_uuid()::text,v_item.agency_id,p_actor_id,'user','post_schedule',v_post.id,'created',
      jsonb_build_object('content_item_id',v_item.id,'scheduled_at',p_scheduled_at));
  return to_jsonb(v_post);
end $$;

create or replace function phase7_update_post(p_post_id text, p_actor_id text, p_scheduled_at timestamptz, p_caption text, p_music text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_post post_schedule%rowtype;
  v_old post_schedule%rowtype;
  v_item content_items%rowtype;
  v_actor users%rowtype;
  v_client clients%rowtype;
begin
  select * into v_post from post_schedule where id = p_post_id for update;
  select * into v_actor from users where id = p_actor_id and is_active;
  if v_post.id is null or v_actor.id is null then raise exception 'Forbidden'; end if;
  select * into v_item from content_items where id = v_post.content_item_id for update;
  select * into v_client from clients where id = v_item.client_id;
  if v_actor.agency_id <> v_post.agency_id or v_actor.role not in ('admin','brand_manager')
    or (v_actor.role = 'brand_manager' and v_client.manager_id <> v_actor.id) then raise exception 'Forbidden'; end if;
  if v_post.posted_at is not null then raise exception 'This post is already marked posted. Undo that first to edit it'; end if;
  v_old := v_post;
  update post_schedule set scheduled_at = p_scheduled_at, caption = coalesce(p_caption,''),
    bg_music_ref = nullif(btrim(coalesce(p_music,'')),''), updated_at = now() where id = p_post_id returning * into v_post;
  insert into activity_log(id,agency_id,actor_id,actor_type,entity_type,entity_id,action,metadata)
    values(gen_random_uuid()::text,v_post.agency_id,p_actor_id,'user','post_schedule',v_post.id,'updated',
      jsonb_build_object('content_item_id',v_post.content_item_id,'old_scheduled_at',v_old.scheduled_at,'scheduled_at',v_post.scheduled_at));
  return to_jsonb(v_post);
end $$;

-- Posting sets posted_at / posted_by and moves the item to 'posted'. A date in the past is fine: people catch up.
create or replace function phase7_mark_posted(p_post_id text, p_actor_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_post post_schedule%rowtype;
  v_item content_items%rowtype;
  v_actor users%rowtype;
  v_client clients%rowtype;
begin
  select * into v_post from post_schedule where id = p_post_id for update;
  select * into v_actor from users where id = p_actor_id and is_active;
  if v_post.id is null or v_actor.id is null then raise exception 'Forbidden'; end if;
  select * into v_item from content_items where id = v_post.content_item_id for update;
  select * into v_client from clients where id = v_item.client_id;
  if v_actor.agency_id <> v_post.agency_id or v_actor.role not in ('admin','brand_manager')
    or (v_actor.role = 'brand_manager' and v_client.manager_id <> v_actor.id) then raise exception 'Forbidden'; end if;
  if v_post.posted_at is not null then raise exception 'This post is already marked posted'; end if;
  if v_item.status <> 'scheduled' then
    raise exception 'Only a scheduled item can be marked posted. This item is %', replace(v_item.status::text, '_', ' ');
  end if;
  update post_schedule set posted_at = now(), posted_by = p_actor_id, updated_at = now() where id = p_post_id returning * into v_post;
  update content_items set status = 'posted', updated_at = now() where id = v_item.id;
  insert into activity_log(id,agency_id,actor_id,actor_type,entity_type,entity_id,action,from_state,to_state,metadata)
    values(gen_random_uuid()::text,v_post.agency_id,p_actor_id,'user','content_item',v_item.id,
      'content_status_changed','scheduled','posted',
      jsonb_build_object('post_id',v_post.id,'scheduled_at',v_post.scheduled_at,'posted_at',v_post.posted_at));
  return to_jsonb(v_post);
end $$;

create or replace function phase7_unmark_posted(p_post_id text, p_actor_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_post post_schedule%rowtype;
  v_item content_items%rowtype;
  v_actor users%rowtype;
  v_client clients%rowtype;
  v_posted_at timestamptz;
begin
  select * into v_post from post_schedule where id = p_post_id for update;
  select * into v_actor from users where id = p_actor_id and is_active;
  if v_post.id is null or v_actor.id is null then raise exception 'Forbidden'; end if;
  select * into v_item from content_items where id = v_post.content_item_id for update;
  select * into v_client from clients where id = v_item.client_id;
  if v_actor.agency_id <> v_post.agency_id or v_actor.role not in ('admin','brand_manager')
    or (v_actor.role = 'brand_manager' and v_client.manager_id <> v_actor.id) then raise exception 'Forbidden'; end if;
  if v_post.posted_at is null or v_item.status <> 'posted' then raise exception 'This post is not marked posted'; end if;
  if v_post.posted_at < now() - interval '24 hours' then
    raise exception 'Un-marking is only possible within 24 hours of posting. This one was posted more than a day ago';
  end if;
  v_posted_at := v_post.posted_at;
  update post_schedule set posted_at = null, posted_by = null, updated_at = now() where id = p_post_id returning * into v_post;
  update content_items set status = 'scheduled', updated_at = now() where id = v_item.id;
  insert into activity_log(id,agency_id,actor_id,actor_type,entity_type,entity_id,action,from_state,to_state,metadata)
    values(gen_random_uuid()::text,v_post.agency_id,p_actor_id,'user','content_item',v_item.id,
      'post_unmarked','posted','scheduled',
      jsonb_build_object('post_id',v_post.id,'posted_at',v_posted_at,'reversal',true));
  return to_jsonb(v_post);
end $$;

revoke all on function phase7_schedule_post(text,text,timestamptz,text,text) from public, anon, authenticated;
revoke all on function phase7_update_post(text,text,timestamptz,text,text) from public, anon, authenticated;
revoke all on function phase7_mark_posted(text,text) from public, anon, authenticated;
revoke all on function phase7_unmark_posted(text,text) from public, anon, authenticated;
grant execute on function phase7_schedule_post(text,text,timestamptz,text,text) to service_role;
grant execute on function phase7_update_post(text,text,timestamptz,text,text) to service_role;
grant execute on function phase7_mark_posted(text,text) to service_role;
grant execute on function phase7_unmark_posted(text,text) to service_role;
