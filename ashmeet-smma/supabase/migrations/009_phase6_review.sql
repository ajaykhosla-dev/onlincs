-- Phase 6: timestamped review, internal approval, client magic links and client responses.
-- Every function is service-role only. Route handlers authorize first; each function re-checks
-- role, agency and ownership inside the same transaction that changes state.

-- ── Columns ───────────────────────────────────────────────────────────────
alter table comments add column if not exists transcript_status text
  check (transcript_status in ('pending','done','failed'));
alter table comments add column if not exists edited_at timestamptz;
update comments set transcript_status = 'done'
  where voice_note_key is not null and transcript is not null and transcript_status is null;
create index if not exists idx_comments_version on comments(version_id, created_at);

alter table approval_links add column if not exists failed_attempts integer not null default 0;
alter table approval_links add column if not exists locked_at timestamptz;
create unique index if not exists uq_approval_links_token on approval_links(token_hash);
create index if not exists idx_approval_links_item on approval_links(content_item_id);

create table if not exists approval_link_views (
  id text primary key default gen_random_uuid()::text,
  agency_id text not null references agencies(id),
  link_id text not null references approval_links(id),
  ip text,
  user_agent text,
  viewed_at timestamptz not null default now()
);
create index if not exists idx_approval_link_views_link on approval_link_views(link_id, viewed_at);
alter table approval_link_views enable row level security;
revoke all on approval_link_views from anon, authenticated;

-- ── Editors may resubmit from the revision states ─────────────────────────
-- Sending changes places the item straight into the Re-do queue, so the editor uploads the next
-- cut from changes_requested / client_changes without a reassignment step.
create or replace function phase5_complete_cut(p_session_id text, p_actor_id text, p_duration_seconds integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_session media_upload_sessions%rowtype;
  v_item content_items%rowtype;
  v_version deliverable_versions%rowtype;
  v_next integer;
  v_from content_status;
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
    or v_item.status not in ('with_editor','changes_requested','client_changes') then
    raise exception 'Item is no longer assigned for editing';
  end if;
  v_from := v_item.status;
  select coalesce(max(version),0)+1 into v_next from deliverable_versions where content_item_id = v_item.id;
  insert into deliverable_versions(id,agency_id,content_item_id,version,b2_key,file_size_bytes,duration_seconds,uploaded_by,status)
    values(gen_random_uuid()::text,v_item.agency_id,v_item.id,v_next,v_session.b2_key,
      v_session.file_size_bytes,p_duration_seconds,p_actor_id,'submitted') returning * into v_version;
  update content_items set status = 'cut_submitted', updated_at = now() where id = v_item.id;
  update media_upload_sessions set state = 'completed', result_id = v_version.id, updated_at = now() where id = p_session_id;
  insert into activity_log(id,agency_id,actor_id,actor_type,entity_type,entity_id,action,from_state,to_state,metadata)
    values(gen_random_uuid()::text,v_item.agency_id,p_actor_id,'user','content_item',v_item.id,
      'cut_submitted',v_from::text,'cut_submitted',jsonb_build_object('version_id',v_version.id,'version',v_next));
  return to_jsonb(v_version);
end $$;

-- ── Internal review ───────────────────────────────────────────────────────
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
    insert into notifications(id,agency_id,user_id,type,title,body,link)
      values(gen_random_uuid()::text,v_item.agency_id,v_item.assigned_editor_id,'revision',
        'Changes requested',v_item.title||' · version '||v_version.version,'/editor/redo');
  end if;
  return to_jsonb(v_item);
end $$;

-- Re-enter the revision loop from a client-approved item.
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
    insert into notifications(id,agency_id,user_id,type,title,body,link)
      values(gen_random_uuid()::text,v_item.agency_id,v_item.assigned_editor_id,'revision',
        'Changes requested after approval',v_item.title,'/editor/redo');
  end if;
  return to_jsonb(v_item);
end $$;

-- ── Magic links ───────────────────────────────────────────────────────────
-- Only hashes arrive here. The route handler generates the token and PIN and returns them once.
create or replace function phase6_create_link(p_item_id text, p_actor_id text, p_token_hash text, p_pin_hash text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_item content_items%rowtype;
  v_actor users%rowtype;
  v_client clients%rowtype;
  v_version deliverable_versions%rowtype;
  v_link approval_links%rowtype;
  v_from content_status;
begin
  select * into v_item from content_items where id = p_item_id for update;
  select * into v_actor from users where id = p_actor_id and is_active;
  if v_item.id is null or v_actor.id is null then raise exception 'Forbidden'; end if;
  select * into v_client from clients where id = v_item.client_id;
  if v_actor.agency_id <> v_item.agency_id or v_actor.role not in ('admin','brand_manager')
    or (v_actor.role = 'brand_manager' and v_client.manager_id <> v_actor.id) then raise exception 'Forbidden'; end if;
  if v_item.status not in ('internally_approved','with_client') then
    raise exception 'The item must be internally approved before it can be sent to the client';
  end if;
  select * into v_version from deliverable_versions where content_item_id = v_item.id order by version desc limit 1;
  if v_version.id is null or v_version.status <> 'internally_approved' then
    raise exception 'The latest cut has not been internally approved';
  end if;
  update approval_links set revoked_at = now()
    where content_item_id = v_item.id and revoked_at is null and responded_at is null;
  insert into approval_links(id,agency_id,content_item_id,version_id,token_hash,pin_hash,expires_at,client_name,created_by)
    values(gen_random_uuid()::text,v_item.agency_id,v_item.id,v_version.id,p_token_hash,p_pin_hash,
      now() + interval '7 days',v_client.name,p_actor_id) returning * into v_link;
  v_from := v_item.status;
  if v_from = 'internally_approved' then
    update content_items set status = 'with_client', updated_at = now() where id = v_item.id;
    insert into activity_log(id,agency_id,actor_id,actor_type,entity_type,entity_id,action,from_state,to_state,metadata)
      values(gen_random_uuid()::text,v_item.agency_id,p_actor_id,'user','content_item',v_item.id,
        'content_status_changed','internally_approved','with_client',
        jsonb_build_object('version_id',v_version.id,'link_id',v_link.id));
  end if;
  insert into activity_log(id,agency_id,actor_id,actor_type,entity_type,entity_id,action,metadata)
    values(gen_random_uuid()::text,v_item.agency_id,p_actor_id,'user','approval_link',v_link.id,
      case when v_from = 'with_client' then 'regenerated' else 'created' end,
      jsonb_build_object('content_item_id',v_item.id,'version_id',v_version.id));
  return jsonb_build_object('id',v_link.id,'expires_at',v_link.expires_at,'version_id',v_version.id);
end $$;

create or replace function phase6_revoke_link(p_item_id text, p_actor_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_item content_items%rowtype;
  v_actor users%rowtype;
  v_client clients%rowtype;
  v_count integer;
begin
  select * into v_item from content_items where id = p_item_id for update;
  select * into v_actor from users where id = p_actor_id and is_active;
  if v_item.id is null or v_actor.id is null then raise exception 'Forbidden'; end if;
  select * into v_client from clients where id = v_item.client_id;
  if v_actor.agency_id <> v_item.agency_id or v_actor.role not in ('admin','brand_manager')
    or (v_actor.role = 'brand_manager' and v_client.manager_id <> v_actor.id) then raise exception 'Forbidden'; end if;
  with revoked as (
    update approval_links set revoked_at = now()
      where content_item_id = v_item.id and revoked_at is null and responded_at is null returning id)
  select count(*) into v_count from revoked;
  if v_count = 0 then raise exception 'There is no active link to revoke'; end if;
  insert into activity_log(id,agency_id,actor_id,actor_type,entity_type,entity_id,action,metadata)
    values(gen_random_uuid()::text,v_item.agency_id,p_actor_id,'user','content_item',v_item.id,
      'approval_link_revoked',jsonb_build_object('revoked',v_count));
  return jsonb_build_object('revoked',v_count);
end $$;

-- ── Client side (no session; the route handler resolves the token first) ──
create or replace function phase6_pin_attempt(p_link_id text, p_ok boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_link approval_links%rowtype;
begin
  select * into v_link from approval_links where id = p_link_id for update;
  if v_link.id is null then raise exception 'Link not found'; end if;
  if v_link.locked_at is not null then return jsonb_build_object('locked',true,'remaining',0); end if;
  if p_ok then
    update approval_links set failed_attempts = 0 where id = v_link.id;
    return jsonb_build_object('locked',false,'remaining',5);
  end if;
  update approval_links set failed_attempts = failed_attempts + 1,
    locked_at = case when failed_attempts + 1 >= 5 then now() else null end
    where id = v_link.id returning * into v_link;
  return jsonb_build_object('locked',v_link.locked_at is not null,'remaining',greatest(0,5 - v_link.failed_attempts));
end $$;

create or replace function phase6_record_view(p_link_id text, p_ip text, p_user_agent text)
returns void language plpgsql security definer set search_path = public as $$
declare v_link approval_links%rowtype;
begin
  select * into v_link from approval_links where id = p_link_id for update;
  if v_link.id is null then return; end if;
  insert into approval_link_views(agency_id,link_id,ip,user_agent) values(v_link.agency_id,v_link.id,p_ip,left(p_user_agent,512));
  if v_link.viewed_at is null then update approval_links set viewed_at = now() where id = v_link.id; end if;
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
        v_item.title||' · '||v_client.name,'/manager/den');
  end if;
  if p_response = 'changes' and v_item.assigned_editor_id is not null then
    insert into notifications(id,agency_id,user_id,type,title,body,link)
      values(gen_random_uuid()::text,v_link.agency_id,v_item.assigned_editor_id,'revision',
        'Client requested changes',v_item.title,'/editor/redo');
  end if;
  return jsonb_build_object('response',p_response);
end $$;

revoke all on function phase5_complete_cut(text,text,integer) from public, anon, authenticated;
revoke all on function phase6_review_decision(text,text,text) from public, anon, authenticated;
revoke all on function phase6_reopen_item(text,text,text) from public, anon, authenticated;
revoke all on function phase6_create_link(text,text,text,text) from public, anon, authenticated;
revoke all on function phase6_revoke_link(text,text) from public, anon, authenticated;
revoke all on function phase6_pin_attempt(text,boolean) from public, anon, authenticated;
revoke all on function phase6_record_view(text,text,text) from public, anon, authenticated;
revoke all on function phase6_client_respond(text,text,text) from public, anon, authenticated;
grant execute on function phase5_complete_cut(text,text,integer) to service_role;
grant execute on function phase6_review_decision(text,text,text) to service_role;
grant execute on function phase6_reopen_item(text,text,text) to service_role;
grant execute on function phase6_create_link(text,text,text,text) to service_role;
grant execute on function phase6_revoke_link(text,text) to service_role;
grant execute on function phase6_pin_attempt(text,boolean) to service_role;
grant execute on function phase6_record_view(text,text,text) to service_role;
grant execute on function phase6_client_respond(text,text,text) to service_role;
