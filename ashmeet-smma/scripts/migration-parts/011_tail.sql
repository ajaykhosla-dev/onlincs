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
