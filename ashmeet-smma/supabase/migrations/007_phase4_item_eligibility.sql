-- Phase 4 follow-up: every newly linked shoot item must be ready for a shoot.
-- The seed contains historical shoots linked to later-stage content; this trigger
-- applies to new links only and leaves that historical data untouched.
create or replace function phase4_validate_shoot_item()
returns trigger language plpgsql set search_path=public as $$
declare v_status content_status;
begin
  select status into v_status from content_items where id=new.content_item_id;
  if v_status not in ('calendar_approved','shoot_scheduled') then
    raise exception 'Content item must be calendar approved or already shoot scheduled';
  end if;
  return new;
end $$;

drop trigger if exists trg_phase4_validate_shoot_item on shoot_items;
create trigger trg_phase4_validate_shoot_item
  before insert on shoot_items for each row execute function phase4_validate_shoot_item();

revoke all on function phase4_validate_shoot_item() from public,anon,authenticated;
