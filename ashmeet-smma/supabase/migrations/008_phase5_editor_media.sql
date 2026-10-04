-- Phase 5: atomic editor assignment and media completion.
create table if not exists media_upload_sessions (
  id text primary key,
  agency_id text not null references agencies(id),
  kind text not null check (kind in ('cut','library')),
  content_item_id text references content_items(id),
  client_id text references clients(id),
  folder_name text,
  file_name text not null,
  content_type text not null,
  file_size_bytes bigint not null check (file_size_bytes > 0),
  b2_key text not null unique,
  b2_upload_id text not null,
  uploader_id text not null references users(id),
  state text not null default 'active' check (state in ('active','completing','aborting','completed','aborted')),
  result_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind = 'cut' and content_item_id is not null and client_id is null)
      or (kind = 'library' and client_id is not null and content_item_id is null))
);
create index if not exists idx_media_upload_sessions_uploader on media_upload_sessions(uploader_id,state);
create unique index if not exists uq_media_upload_active_cut on media_upload_sessions(content_item_id)
  where kind = 'cut' and state in ('active','completing','aborting');
alter table media_upload_sessions enable row level security;
revoke all on media_upload_sessions from anon, authenticated;

create or replace function phase5_assign_editor(p_item_id text, p_editor_id text, p_deadline date, p_actor_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_item content_items%rowtype;
  v_actor users%rowtype;
  v_editor users%rowtype;
  v_client clients%rowtype;
  v_old_editor text;
  v_old_status content_status;
begin
  select * into v_item from content_items where id = p_item_id for update;
  select * into v_actor from users where id = p_actor_id and is_active;
  if v_item.id is null or v_actor.id is null then raise exception 'Forbidden'; end if;
  select * into v_client from clients where id = v_item.client_id;
  select * into v_editor from users where id = p_editor_id and role = 'editor' and is_active
    and agency_id = v_item.agency_id;
  if v_editor.id is null or v_actor.agency_id <> v_item.agency_id
    or v_actor.role not in ('admin','brand_manager')
    or (v_actor.role = 'brand_manager' and v_client.manager_id <> v_actor.id) then
    raise exception 'Forbidden';
  end if;
  if v_item.status not in ('raw_uploaded','changes_requested','with_editor') then
    raise exception 'Item is not ready for editor assignment';
  end if;
  if p_deadline is null then raise exception 'Deadline required'; end if;
  v_old_editor := v_item.assigned_editor_id;
  v_old_status := v_item.status;
  update content_items set assigned_editor_id = p_editor_id, deadline = p_deadline,
    status = 'with_editor', updated_at = now() where id = p_item_id returning * into v_item;
  insert into activity_log(id,agency_id,actor_id,actor_type,entity_type,entity_id,action,from_state,to_state,metadata)
    values(gen_random_uuid()::text,v_item.agency_id,p_actor_id,'user','content_item',p_item_id,
      case when v_old_editor is distinct from p_editor_id then 'editor_assigned' else 'editor_deadline_updated' end,
      v_old_status::text,'with_editor',jsonb_build_object('old_editor_id',v_old_editor,
        'new_editor_id',p_editor_id,'deadline',p_deadline));
  return to_jsonb(v_item);
end $$;

create or replace function phase5_complete_cut(p_session_id text, p_actor_id text, p_duration_seconds integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_session media_upload_sessions%rowtype;
  v_item content_items%rowtype;
  v_version deliverable_versions%rowtype;
  v_next integer;
begin
  select * into v_session from media_upload_sessions where id = p_session_id for update;
  if v_session.id is null or v_session.kind <> 'cut' or v_session.uploader_id <> p_actor_id then raise exception 'Forbidden'; end if;
  if v_session.state = 'completed' then
    select * into v_version from deliverable_versions where id = v_session.result_id;
    return to_jsonb(v_version);
  end if;
  if v_session.state <> 'completing' then raise exception 'Upload session is not ready to complete'; end if;
  select * into v_item from content_items where id = v_session.content_item_id for update;
  if v_item.agency_id <> v_session.agency_id or v_item.assigned_editor_id <> p_actor_id
    or v_item.status <> 'with_editor' then raise exception 'Item is no longer assigned for editing'; end if;
  select coalesce(max(version),0)+1 into v_next from deliverable_versions where content_item_id = v_item.id;
  insert into deliverable_versions(id,agency_id,content_item_id,version,b2_key,file_size_bytes,duration_seconds,uploaded_by,status)
    values(gen_random_uuid()::text,v_item.agency_id,v_item.id,v_next,v_session.b2_key,
      v_session.file_size_bytes,p_duration_seconds,p_actor_id,'submitted') returning * into v_version;
  update content_items set status = 'cut_submitted', updated_at = now() where id = v_item.id;
  update media_upload_sessions set state = 'completed', result_id = v_version.id, updated_at = now() where id = p_session_id;
  insert into activity_log(id,agency_id,actor_id,actor_type,entity_type,entity_id,action,from_state,to_state,metadata)
    values(gen_random_uuid()::text,v_item.agency_id,p_actor_id,'user','content_item',v_item.id,
      'cut_submitted','with_editor','cut_submitted',jsonb_build_object('version_id',v_version.id,'version',v_next));
  return to_jsonb(v_version);
end $$;

create or replace function phase5_complete_library(p_session_id text, p_actor_id text, p_asset_kind text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_session media_upload_sessions%rowtype;
  v_asset library_assets%rowtype;
begin
  select * into v_session from media_upload_sessions where id = p_session_id for update;
  if v_session.id is null or v_session.kind <> 'library' or v_session.uploader_id <> p_actor_id then raise exception 'Forbidden'; end if;
  if v_session.state = 'completed' then
    select * into v_asset from library_assets where id = v_session.result_id;
    return to_jsonb(v_asset);
  end if;
  if v_session.state <> 'completing' or p_asset_kind not in ('video','image','audio','document') then
    raise exception 'Invalid upload session or asset kind';
  end if;
  insert into library_assets(id,agency_id,client_id,folder_name,name,b2_key,kind,file_size_bytes,uploaded_by)
    values(gen_random_uuid()::text,v_session.agency_id,v_session.client_id,v_session.folder_name,
      v_session.file_name,v_session.b2_key,p_asset_kind,v_session.file_size_bytes,p_actor_id) returning * into v_asset;
  update media_upload_sessions set state = 'completed', result_id = v_asset.id, updated_at = now() where id = p_session_id;
  insert into activity_log(id,agency_id,actor_id,actor_type,entity_type,entity_id,action,metadata)
    values(gen_random_uuid()::text,v_session.agency_id,p_actor_id,'user','library_asset',v_asset.id,'created',
      jsonb_build_object('client_id',v_session.client_id,'folder_name',v_session.folder_name));
  return to_jsonb(v_asset);
end $$;

-- Approval and change actions always affect the latest cut only.
create or replace function phase5_sync_version_status() returns trigger language plpgsql
security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and new.status::text in
    ('changes_requested','client_changes','internally_approved','client_approved') then
    update deliverable_versions set status = case
      when new.status::text in ('changes_requested','client_changes') then 'changes_requested'::version_status
      when new.status::text = 'internally_approved' then 'internally_approved'::version_status
      else 'client_approved'::version_status end
    where id = (select id from deliverable_versions where content_item_id = new.id order by version desc limit 1);
  end if;
  return new;
end $$;
drop trigger if exists phase5_sync_version_status_trigger on content_items;
create trigger phase5_sync_version_status_trigger after update of status on content_items
for each row execute function phase5_sync_version_status();

revoke all on function phase5_assign_editor(text,text,date,text) from public, anon, authenticated;
revoke all on function phase5_complete_cut(text,text,integer) from public, anon, authenticated;
revoke all on function phase5_complete_library(text,text,text) from public, anon, authenticated;
grant execute on function phase5_assign_editor(text,text,date,text) to service_role;
grant execute on function phase5_complete_cut(text,text,integer) to service_role;
grant execute on function phase5_complete_library(text,text,text) to service_role;
