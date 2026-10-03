-- Migration: 002_seed (part 4)
-- Gap-fill so Phase 0 checkpoints hold:
--   * every content status has >= 2 rows
--   * activity_log > 100 rows over > 30 days
--   * 3 library folders per Ashmeet client
--   * Northside Social has real data in every tenant table, so isolation tests can fail

-- ── Ashmeet: second row for each status that had only one ────────────────
insert into content_items
  (id, agency_id, client_id, title, slug, type, concept, status, planned_date, planned_time, deadline, assigned_editor_id, created_by, updated_at, created_at)
values
  ('ci-37', 'ag-1', 'cl-1', 'Braces care guide reel',       'ci-ramanadental-009',    'reel',     'Aftercare for braces',      'shoot_scheduled',  '2026-09-26', '10:00', '2026-10-03', 'u-5', 'u-2', '2026-09-23T10:00:00Z', '2026-09-17T09:00:00Z'),
  ('ci-38', 'ag-1', 'cl-3', 'Balcony makeover reel',        'ci-sandhuinteriors-006', 'reel',     'Small balcony transformation', 'raw_uploaded',   '2026-09-12', '09:00', '2026-09-24', 'u-6', 'u-3', '2026-09-23T10:00:00Z', '2026-09-09T09:00:00Z'),
  ('ci-39', 'ag-1', 'cl-5', 'Pastry of the week post',      'ci-basilcafe-007',       'post',     'Weekly pastry feature',     'cut_submitted',    '2026-09-16', '11:00', '2026-09-24', 'u-6', 'u-4', '2026-09-23T10:00:00Z', '2026-09-12T11:00:00Z'),
  ('ci-40', 'ag-1', 'cl-4', 'Polki set closeup reel',       'ci-khannajewellers-007', 'reel',     'Macro shots of polki set',  'changes_requested','2026-09-15', '12:00', '2026-09-23', 'u-5', 'u-3', '2026-09-23T10:00:00Z', '2026-09-10T12:00:00Z'),
  ('ci-41', 'ag-1', 'cl-2', 'Test drive weekend reel',      'ci-grovermotors-009',    'reel',     'Weekend test drive event',  'client_changes',   '2026-09-17', '10:00', '2026-09-24', 'u-6', 'u-2', '2026-09-23T10:00:00Z', '2026-09-13T10:00:00Z'),
  ('ci-42', 'ag-1', 'cl-1', 'Dental hygiene day post',      'ci-ramanadental-010',    'post',     'Awareness day creative',    'client_approved',  '2026-09-18', '09:00', '2026-09-25', 'u-5', 'u-2', '2026-09-23T10:00:00Z', '2026-09-14T09:00:00Z');

-- ── Ashmeet: pad library to 3 folders per client ─────────────────────────
insert into library_assets (id, agency_id, client_id, folder_name, name, b2_key, kind, file_size_bytes, uploaded_by)
select 'la-p4-' || c.id || '-' || f.folder, 'ag-1', c.id, f.folder, f.folder || ' starter.png',
       'b2/lib/' || c.id || '/' || f.folder || '-starter.png', 'image', 204800, coalesce(c.manager_id, 'u-1')
from clients c cross join (values ('brand-assets'), ('raw-uploads'), ('reference')) as f(folder)
where c.agency_id = 'ag-1'
  and not exists (select 1 from library_assets l where l.client_id = c.id and l.folder_name = f.folder);

-- ── Ashmeet: background activity so the log exceeds 100 rows over 30+ days ──
insert into activity_log (id, agency_id, actor_id, actor_type, entity_type, entity_id, action, from_state, to_state, metadata, created_at)
select 'act-g' || n, 'ag-1',
       (array['u-1','u-2','u-3','u-4','u-5','u-6','u-7','u-8'])[1 + (n % 8)], 'user',
       'content_item', 'ci-' || (1 + (n * 7) % 36),
       (array['viewed','updated','commented'])[1 + (n % 3)], null, null,
       jsonb_build_object('seeded', true),
       timestamptz '2026-09-23 12:00:00+00' - (n * interval '19 hours')
from generate_series(1, 45) n;

-- ── Northside Social: data in every tenant table ─────────────────────────
insert into clients (id, agency_id, code, name, handle, niche, manager_id, status, onboarded_at) values
  ('cl-n1', 'ag-2', 'NS-01', 'Harbor Cafe',   '@harborcafe',  'Food & Beverage', 'u-10', 'active', '2026-08-01'),
  ('cl-n2', 'ag-2', 'NS-02', 'Pier Fitness',  '@pierfitness', 'Fitness',         'u-10', 'active', '2026-08-15');

insert into client_scope (id, agency_id, client_id, month, reel_count, post_count, carousel_count, story_count) values
  ('cs-n1', 'ag-2', 'cl-n1', '2026-09-01', 4, 4, 2, 2),
  ('cs-n2', 'ag-2', 'cl-n2', '2026-09-01', 3, 3, 2, 2);

insert into content_items
  (id, agency_id, client_id, title, slug, type, concept, status, planned_date, planned_time, deadline, assigned_editor_id, created_by, updated_at, created_at)
values
  ('ci-n1', 'ag-2', 'cl-n1', 'Harbor brunch reel',    'ns-harborcafe-001', 'reel',     'Brunch menu',       'planned',         '2026-09-25', '09:00', '2026-10-02', null,   'u-10', '2026-09-23T10:00:00Z', '2026-09-10T09:00:00Z'),
  ('ci-n2', 'ag-2', 'cl-n1', 'Barista spotlight',     'ns-harborcafe-002', 'reel',     'Barista story',     'with_editor',     '2026-09-20', '10:00', '2026-09-27', 'u-11', 'u-10', '2026-09-23T10:00:00Z', '2026-09-11T09:00:00Z'),
  ('ci-n3', 'ag-2', 'cl-n2', 'Morning class promo',   'ns-pierfitness-001','reel',     'Class promo',       'cut_submitted',   '2026-09-18', '07:00', '2026-09-24', 'u-11', 'u-10', '2026-09-23T10:00:00Z', '2026-09-08T09:00:00Z'),
  ('ci-n4', 'ag-2', 'cl-n2', 'Trainer intro',         'ns-pierfitness-002','post',     'Meet the trainers', 'shoot_scheduled', '2026-09-27', '11:00', '2026-10-04', 'u-13', 'u-10', '2026-09-23T10:00:00Z', '2026-09-12T09:00:00Z'),
  ('ci-n5', 'ag-2', 'cl-n1', 'Weekend special post',  'ns-harborcafe-003', 'post',     'Weekend special',   'posted',          '2026-09-14', '12:00', '2026-09-18', 'u-13', 'u-10', '2026-09-23T10:00:00Z', '2026-09-05T09:00:00Z');

insert into monthly_plans (id, agency_id, client_id, month, status, approved_at) values
  ('mp-n1', 'ag-2', 'cl-n1', '2026-09-01', 'approved', '2026-08-28T10:00:00Z'),
  ('mp-n2', 'ag-2', 'cl-n2', '2026-09-01', 'draft', null);

insert into shoots (id, agency_id, client_id, title, scheduled_start, scheduled_end, location, cameraman_id, status, created_by) values
  ('sh-n1', 'ag-2', 'cl-n2', 'Pier Fitness trainer shoot', '2026-09-26T05:30:00Z', '2026-09-26T08:30:00Z', 'Pier Fitness studio', 'u-12', 'scheduled', 'u-10');

insert into shoot_items (shoot_id, content_item_id, idea_slug) values
  ('sh-n1', 'ci-n4', 'trainer-intro');

insert into upload_sessions (id, agency_id, shoot_id, content_item_id, file_name, file_size_bytes, mime_type, session_uri_enc, bytes_received, status, expires_at, started_by) values
  ('us-n1', 'ag-2', 'sh-n1', 'ci-n4', 'trainer_a001.mp4', 1073741824, 'video/mp4', 'SEED-NOT-A-REAL-SESSION-URI', 0, 'active', '2026-09-30T00:00:00Z', 'u-12');

insert into raw_files (id, agency_id, shoot_id, content_item_id, drive_file_id, drive_link, file_name, size_bytes, mime_type, source) values
  ('rf-n1', 'ag-2', 'sh-n1', 'ci-n4', 'drv-northside-0001', 'https://drive.google.com/file/d/drv-northside-0001', 'trainer_a000.mp4', 524288000, 'video/mp4', 'wrapper');

insert into deliverable_versions (id, agency_id, content_item_id, version, b2_key, file_size_bytes, duration_seconds, uploaded_by, status) values
  ('dv-n1', 'ag-2', 'ci-n3', 1, 'ag-2/cuts/ci-n3/v1.mp4', 62914560, 28, 'u-11', 'submitted');

insert into comments (id, agency_id, version_id, author_id, author_label, timestamp_start, body, source) values
  ('cm-n1', 'ag-2', 'dv-n1', 'u-10', 'Northside BM', 4.5, 'Tighten the intro by a second.', 'internal');

insert into approval_links (id, agency_id, content_item_id, version_id, token_hash, pin_hash, expires_at, client_name, created_by) values
  ('al-n1', 'ag-2', 'ci-n3', 'dv-n1', 'seed-token-hash-n1', 'seed-pin-hash-n1', '2026-10-30T00:00:00Z', 'Pier Fitness', 'u-10');

insert into post_schedule (id, agency_id, content_item_id, scheduled_at, caption, posted_at, posted_by) values
  ('ps-n1', 'ag-2', 'ci-n5', '2026-09-14T06:30:00Z', 'Weekend special at Harbor Cafe', '2026-09-14T06:31:00Z', 'u-10');

insert into library_assets (id, agency_id, client_id, folder_name, name, b2_key, kind, file_size_bytes, uploaded_by) values
  ('la-n1', 'ag-2', 'cl-n1', 'brand-assets', 'Harbor Cafe logo.png', 'b2/lib/cl-n1/logo.png', 'image', 100000, 'u-10');

insert into activity_log (id, agency_id, actor_id, actor_type, entity_type, entity_id, action, from_state, to_state, metadata, created_at) values
  ('act-n1', 'ag-2', 'u-10', 'user', 'content_item', 'ci-n2', 'status_changed', 'planned', 'with_editor', null, '2026-09-12T09:00:00Z'),
  ('act-n2', 'ag-2', 'u-11', 'user', 'content_item', 'ci-n3', 'status_changed', 'with_editor', 'cut_submitted', null, '2026-09-20T09:00:00Z'),
  ('act-n3', 'ag-2', 'u-10', 'user', 'content_item', 'ci-n5', 'status_changed', 'scheduled', 'posted', null, '2026-09-14T06:31:00Z');

insert into drive_sync_state (agency_id, shared_drive_id, page_token, last_polled_at) values
  ('ag-2', 'seed-shared-drive-ns', 'seed-token', '2026-09-23T00:00:00Z');

insert into push_subscriptions (id, agency_id, user_id, endpoint, p256dh, auth) values
  ('ps-sub-n1', 'ag-2', 'u-10', 'https://push.example/northside-bm', 'seed-p256dh', 'seed-auth'),
  ('ps-sub-a1', 'ag-1', 'u-2',  'https://push.example/ashmeet-jaspreet', 'seed-p256dh', 'seed-auth');

insert into notifications (id, agency_id, user_id, type, title, body, link) values
  ('nt-n1', 'ag-2', 'u-10', 'approval', 'Cut ready for review', 'Morning class promo v1', '/manager'),
  ('nt-a1', 'ag-1', 'u-2',  'approval', 'Cut ready for review', 'Root canal myths busted v1', '/manager');
