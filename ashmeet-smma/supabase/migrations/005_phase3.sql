-- Phase 3: transactional content transitions and monthly approval.
-- Only the service-role API may execute these functions. Application authorization
-- runs in lib/pipeline/transitions.ts and route handlers before calling them.

alter table monthly_plans drop constraint if exists monthly_plans_status_check;
update monthly_plans set status = 'changes_requested' where status = 'rejected';
alter table monthly_plans add constraint monthly_plans_status_check
  check (status in ('draft', 'sent_to_client', 'approved', 'changes_requested'));

create or replace function phase3_transition(
  p_item_id text, p_to_status content_status, p_actor_id text, p_expected_status content_status
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_item content_items%rowtype;
  v_actor users%rowtype;
  v_client clients%rowtype;
  v_allowed text[];
begin
  select * into v_item from content_items where id = p_item_id for update;
  if not found then raise exception 'Content item not found'; end if;
  select * into v_actor from users where id = p_actor_id and is_active;
  select * into v_client from clients where id = v_item.client_id;
  if v_actor.id is null or v_actor.agency_id <> v_item.agency_id then raise exception 'Forbidden'; end if;
  if v_actor.role = 'brand_manager' and v_client.manager_id <> v_actor.id then raise exception 'Forbidden'; end if;
  if v_actor.role = 'editor' and v_item.assigned_editor_id is distinct from v_actor.id then raise exception 'Forbidden'; end if;
  if v_actor.role not in ('admin', 'brand_manager', 'editor') then raise exception 'Forbidden'; end if;
  if v_item.status <> p_expected_status then raise exception 'Status changed: expected %, found %', p_expected_status, v_item.status; end if;
  v_allowed := case v_item.status
    when 'planned' then array['calendar_approved','archived']
    when 'calendar_approved' then array['shoot_scheduled','with_editor','archived']
    when 'shoot_scheduled' then array['raw_uploaded','archived']
    when 'raw_uploaded' then array['with_editor','archived']
    when 'with_editor' then array['cut_submitted','archived']
    when 'cut_submitted' then array['changes_requested','internally_approved','archived']
    when 'changes_requested' then array['with_editor','archived']
    when 'internally_approved' then array['with_client','client_changes','archived']
    when 'with_client' then array['client_changes','client_approved','archived']
    when 'client_changes' then array['with_editor','archived']
    when 'client_approved' then array['scheduled','archived']
    when 'scheduled' then array['posted','archived']
    when 'posted' then array['archived']
    else array[]::text[] end;
  if not p_to_status::text = any(v_allowed) then
    raise exception 'Cannot move content item from % to %', v_item.status, p_to_status;
  end if;
  if v_actor.role = 'editor' and p_to_status not in ('with_editor','cut_submitted') then raise exception 'Forbidden'; end if;
  update content_items set status = p_to_status, updated_at = now() where id = p_item_id returning * into v_item;
  insert into activity_log(id, agency_id, actor_id, actor_type, entity_type, entity_id, action, from_state, to_state)
    values (gen_random_uuid()::text, v_item.agency_id, p_actor_id, 'user', 'content_item', p_item_id, 'content_status_changed',
      p_expected_status::text, p_to_status::text);
  return to_jsonb(v_item);
end $$;

create or replace function phase3_set_plan_status(
  p_client_id text, p_month date, p_status text, p_actor_id text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_actor users%rowtype;
  v_client clients%rowtype;
  v_plan monthly_plans%rowtype;
  v_item content_items%rowtype;
  v_previous text;
begin
  if p_month <> date_trunc('month', p_month)::date then raise exception 'Month must be the first day'; end if;
  if p_status not in ('draft','sent_to_client','approved','changes_requested') then raise exception 'Invalid plan status'; end if;
  select * into v_actor from users where id = p_actor_id and is_active;
  select * into v_client from clients where id = p_client_id for update;
  if v_actor.id is null or v_client.id is null or v_actor.agency_id <> v_client.agency_id
     or (v_actor.role = 'brand_manager' and v_client.manager_id <> v_actor.id)
     or v_actor.role not in ('admin','brand_manager') then raise exception 'Forbidden'; end if;
  select * into v_plan from monthly_plans where client_id = p_client_id and month = p_month for update;
  v_previous := coalesce(v_plan.status, 'draft');
  if v_previous = 'draft' and p_status not in ('draft','sent_to_client')
    or v_previous = 'sent_to_client' and p_status not in ('sent_to_client','approved','changes_requested')
    or v_previous = 'changes_requested' and p_status not in ('changes_requested','draft','sent_to_client')
    or v_previous = 'approved' and p_status not in ('approved','changes_requested') then
    raise exception 'Cannot move monthly plan from % to %', v_previous, p_status;
  end if;
  if v_plan.id is null then
    insert into monthly_plans(id, agency_id, client_id, month, status, approved_at)
      values(gen_random_uuid()::text, v_client.agency_id, p_client_id, p_month, p_status,
        case when p_status = 'approved' then now() else null end) returning * into v_plan;
  else
    update monthly_plans set status = p_status,
      approved_at = case when p_status = 'approved' then now() else null end
      where id = v_plan.id returning * into v_plan;
  end if;
  insert into activity_log(id,agency_id,actor_id,actor_type,entity_type,entity_id,action,from_state,to_state)
    values(gen_random_uuid()::text,v_client.agency_id,p_actor_id,'user','monthly_plan',v_plan.id,'plan_status_changed',v_previous,p_status);
  if p_status = 'approved' then
    for v_item in select * from content_items
      where client_id = p_client_id and planned_date >= p_month and planned_date < (p_month + interval '1 month')
        and status = 'planned' for update loop
      perform phase3_transition(v_item.id, 'calendar_approved', p_actor_id, 'planned');
    end loop;
  end if;
  return to_jsonb(v_plan);
end $$;

revoke all on function phase3_transition(text,content_status,text,content_status) from public, anon, authenticated;
revoke all on function phase3_set_plan_status(text,date,text,text) from public, anon, authenticated;
grant execute on function phase3_transition(text,content_status,text,content_status) to service_role;
grant execute on function phase3_set_plan_status(text,date,text,text) to service_role;

create or replace function phase3_save_client(p_id text, p_data jsonb, p_scope jsonb, p_actor_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_actor users%rowtype;
  v_client clients%rowtype;
  v_manager users%rowtype;
  v_old_manager text;
  v_month date := date_trunc('month', now())::date;
begin
  select * into v_actor from users where id = p_actor_id and is_active;
  if v_actor.id is null or v_actor.role not in ('admin','brand_manager') then raise exception 'Forbidden'; end if;
  select * into v_manager from users where id = p_data->>'manager_id' and is_active and role = 'brand_manager' and agency_id = v_actor.agency_id;
  if v_manager.id is null then raise exception 'Invalid manager'; end if;
  if p_id is null then
    if v_actor.role <> 'admin' then raise exception 'Forbidden'; end if;
    insert into clients(id,agency_id,code,name,handle,niche,manager_id,status)
      values(gen_random_uuid()::text,v_actor.agency_id,p_data->>'code',p_data->>'name',p_data->>'handle',
        p_data->>'niche',v_manager.id,coalesce(p_data->>'status','onboarding')) returning * into v_client;
    insert into client_scope(id,agency_id,client_id,month,reel_count,post_count,carousel_count,story_count,notes)
      values(gen_random_uuid()::text,v_actor.agency_id,v_client.id,v_month,
        coalesce((p_scope->>'reel_count')::integer,0),coalesce((p_scope->>'post_count')::integer,0),
        coalesce((p_scope->>'carousel_count')::integer,0),coalesce((p_scope->>'story_count')::integer,0),p_scope->>'notes');
    insert into activity_log(id,agency_id,actor_id,actor_type,entity_type,entity_id,action,metadata)
      values(gen_random_uuid()::text,v_actor.agency_id,p_actor_id,'user','client',v_client.id,'created',p_data);
  else
    select * into v_client from clients where id = p_id for update;
    if v_client.id is null or v_client.agency_id <> v_actor.agency_id
       or (v_actor.role = 'brand_manager' and v_client.manager_id <> v_actor.id) then raise exception 'Forbidden'; end if;
    if v_actor.role = 'brand_manager' and v_manager.id <> v_actor.id then raise exception 'Forbidden'; end if;
    v_old_manager := v_client.manager_id;
    update clients set name = p_data->>'name', handle = p_data->>'handle', niche = p_data->>'niche',
      manager_id = v_manager.id, status = p_data->>'status' where id = p_id returning * into v_client;
    insert into activity_log(id,agency_id,actor_id,actor_type,entity_type,entity_id,action,from_state,to_state,metadata)
      values(gen_random_uuid()::text,v_actor.agency_id,p_actor_id,'user','client',p_id,
        case when v_old_manager is distinct from v_manager.id then 'reassigned' else 'updated' end,
        v_old_manager,v_manager.id,p_data);
  end if;
  return to_jsonb(v_client);
end $$;

create or replace function phase3_save_content(p_id text, p_client_id text, p_data jsonb, p_actor_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_actor users%rowtype;
  v_client clients%rowtype;
  v_item content_items%rowtype;
  v_editor users%rowtype;
begin
  select * into v_actor from users where id = p_actor_id and is_active;
  select * into v_client from clients where id = p_client_id;
  if v_actor.id is null or v_client.id is null or v_actor.agency_id <> v_client.agency_id
    or v_actor.role not in ('admin','brand_manager')
    or (v_actor.role = 'brand_manager' and v_client.manager_id <> v_actor.id) then raise exception 'Forbidden'; end if;
  if p_data->>'assigned_editor_id' is not null then
    select * into v_editor from users where id = p_data->>'assigned_editor_id' and agency_id = v_client.agency_id and role = 'editor' and is_active;
    if v_editor.id is null then raise exception 'Invalid editor'; end if;
  end if;
  if p_id is null then
    insert into content_items(id,agency_id,client_id,title,slug,type,concept,script,instructions_editor,instructions_cameraman,
      reference_links,planned_date,planned_time,assigned_editor_id,deadline,created_by)
      values(gen_random_uuid()::text,v_client.agency_id,p_client_id,p_data->>'title',gen_random_uuid()::text,
        (p_data->>'type')::content_type,p_data->>'concept',p_data->>'script',p_data->>'instructions_editor',
        p_data->>'instructions_cameraman',coalesce(p_data->'reference_links','[]'::jsonb),
        (p_data->>'planned_date')::date,p_data->>'planned_time',p_data->>'assigned_editor_id',
        (p_data->>'deadline')::date,p_actor_id) returning * into v_item;
    insert into activity_log(id,agency_id,actor_id,actor_type,entity_type,entity_id,action,to_state,metadata)
      values(gen_random_uuid()::text,v_client.agency_id,p_actor_id,'user','content_item',v_item.id,'created','planned',p_data);
  else
    select * into v_item from content_items where id = p_id for update;
    if v_item.id is null or v_item.client_id <> p_client_id or v_item.agency_id <> v_actor.agency_id then raise exception 'Forbidden'; end if;
    update content_items set title = p_data->>'title',type = (p_data->>'type')::content_type,
      concept = p_data->>'concept',script = p_data->>'script',instructions_editor = p_data->>'instructions_editor',
      instructions_cameraman = p_data->>'instructions_cameraman',reference_links = coalesce(p_data->'reference_links','[]'::jsonb),
      planned_date = (p_data->>'planned_date')::date,planned_time = p_data->>'planned_time',
      assigned_editor_id = p_data->>'assigned_editor_id',deadline = (p_data->>'deadline')::date,updated_at = now()
      where id = p_id returning * into v_item;
    insert into activity_log(id,agency_id,actor_id,actor_type,entity_type,entity_id,action,metadata)
      values(gen_random_uuid()::text,v_client.agency_id,p_actor_id,'user','content_item',p_id,'updated',p_data);
  end if;
  return to_jsonb(v_item);
end $$;

revoke all on function phase3_save_client(text,jsonb,jsonb,text) from public, anon, authenticated;
revoke all on function phase3_save_content(text,text,jsonb,text) from public, anon, authenticated;
grant execute on function phase3_save_client(text,jsonb,jsonb,text) to service_role;
grant execute on function phase3_save_content(text,text,jsonb,text) to service_role;
