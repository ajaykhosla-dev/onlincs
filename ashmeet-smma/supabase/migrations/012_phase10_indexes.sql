-- Phase 10: indexes for the lookups the list screens, analytics and storage view run on every load.
create index if not exists idx_activity_log_agency_entity on activity_log(agency_id, entity_type, created_at);
create index if not exists idx_activity_log_entity on activity_log(entity_id, to_state);
create index if not exists idx_activity_log_actor on activity_log(actor_id, created_at);
create index if not exists idx_content_items_agency_status on content_items(agency_id, status);
create index if not exists idx_content_items_client_planned on content_items(client_id, planned_date);
create index if not exists idx_deliverable_versions_item on deliverable_versions(content_item_id, version);
create index if not exists idx_raw_files_shoot on raw_files(shoot_id);
create index if not exists idx_raw_files_agency on raw_files(agency_id);
create index if not exists idx_shoot_items_item on shoot_items(content_item_id);
create index if not exists idx_upload_sessions_agency_status on upload_sessions(agency_id, status);
create index if not exists idx_library_assets_client on library_assets(client_id);
create index if not exists idx_post_schedule_item on post_schedule(content_item_id);
create index if not exists idx_shoots_agency_client on shoots(agency_id, client_id);
