-- Migration: 002_seed (continued)
-- Shoots, plans, schedules, versions, comments, approval links, activity log

-- ── Monthly Plans ────────────────────────────────────────────────────────
insert into monthly_plans (id, agency_id, client_id, month, status, approved_at, notes) values
  ('mp-1', 'ag-1', 'cl-1', '2026-09-01', 'approved', '2026-08-28', null),
  ('mp-2', 'ag-1', 'cl-2', '2026-09-01', 'approved', '2026-08-25', null),
  ('mp-3', 'ag-1', 'cl-3', '2026-09-01', 'approved', '2026-08-30', null),
  ('mp-4', 'ag-1', 'cl-4', '2026-09-01', 'approved', '2026-08-27', null),
  ('mp-5', 'ag-1', 'cl-5', '2026-09-01', 'approved', '2026-08-29', null),
  ('mp-6', 'ag-1', 'cl-6', '2026-09-01', 'approved', '2026-09-01', 'Onboarding — reduced scope'),
  ('mp-7', 'ag-1', 'cl-1', '2026-10-01', 'sent_to_client', null, null),
  ('mp-8', 'ag-1', 'cl-2', '2026-10-01', 'sent_to_client', null, null),
  ('mp-9', 'ag-1', 'cl-3', '2026-10-01', 'draft', null, null),
  ('mp-10', 'ag-1', 'cl-4', '2026-10-01', 'draft', null, null),
  ('mp-11', 'ag-1', 'cl-5', '2026-10-01', 'draft', null, null);

-- ── Shoots ───────────────────────────────────────────────────────────────
insert into shoots (id, agency_id, client_id, title, scheduled_start, scheduled_end, location, cameraman_id, status, created_by, raw_detected_at) values
  ('sh-1', 'ag-1', 'cl-1', 'Ramana Dental — Sept shoot',     '2026-09-22T09:00:00Z', '2026-09-22T13:00:00Z', 'Ramana Dental Clinic, Ludhiana', 'u-7', 'completed', 'u-2', '2026-09-22T14:00:00Z'),
  ('sh-2', 'ag-1', 'cl-1', 'Ramana Dental — Oct prep',       '2026-09-20T09:00:00Z', '2026-09-20T12:00:00Z', 'Ramana Dental Clinic, Ludhiana', 'u-7', 'completed', 'u-2', null),
  ('sh-3', 'ag-1', 'cl-3', 'Sandhu Interiors — Sept',        '2026-09-24T15:00:00Z', '2026-09-24T18:00:00Z', 'Sandhu Interiors Showroom', 'u-8', 'scheduled', 'u-3', null),
  ('sh-4', 'ag-1', 'cl-3', 'Sandhu — Mrs. Bedi testimonial', '2026-09-25T10:00:00Z', '2026-09-25T11:30:00Z', 'Bedi Residence, Model Town', 'u-8', 'scheduled', 'u-3', null),
  ('sh-5', 'ag-1', 'cl-5', 'Basil Cafe — Sept menu',         '2026-09-26T08:00:00Z', '2026-09-26T11:00:00Z', 'Basil Cafe, Sarabha Nagar', 'u-7', 'scheduled', 'u-4', null),
  ('sh-6', 'ag-1', 'cl-2', 'Grover Motors — Oct',            '2026-10-02T11:30:00Z', '2026-10-02T14:00:00Z', 'Grover Motors Showroom', 'u-8', 'scheduled', 'u-2', null);

-- ── Shoot Items (many-to-many) ───────────────────────────────────────────
insert into shoot_items (shoot_id, content_item_id, idea_slug, drive_subfolder_id, drive_subfolder_link) values
  -- sh-1 covers 3 items
  ('sh-1', 'ci-1',  'smile-makeover-ba', 'dr-sh1-ci1',  'https://drive.google.com/drive/folders/dr-sh1-ci1'),
  ('sh-1', 'ci-2',  'root-canal-myths',  'dr-sh1-ci2',  'https://drive.google.com/drive/folders/dr-sh1-ci2'),
  ('sh-1', 'ci-3',  'why-ramana-dental', 'dr-sh1-ci3',  'https://drive.google.com/drive/folders/dr-sh1-ci3'),
  -- sh-2 covers 1 item
  ('sh-2', 'ci-4',  'teeth-whitening',   'dr-sh2-ci4',  'https://drive.google.com/drive/folders/dr-sh2-ci4'),
  -- sh-3 covers 2 items
  ('sh-3', 'ci-11', 'modular-kitchen',   'dr-sh3-ci11', 'https://drive.google.com/drive/folders/dr-sh3-ci11'),
  ('sh-3', 'ci-13', 'before-after-lr',   'dr-sh3-ci13', 'https://drive.google.com/drive/folders/dr-sh3-ci13'),
  -- sh-4 covers 1 item
  ('sh-4', 'ci-12', 'mrs-bedi-testimonial', 'dr-sh4-ci12', 'https://drive.google.com/drive/folders/dr-sh4-ci12'),
  -- sh-5 covers 2 items
  ('sh-5', 'ci-18', 'new-season-menu',   'dr-sh5-ci18', 'https://drive.google.com/drive/folders/dr-sh5-ci18'),
  ('sh-5', 'ci-19', 'baristas-pick',     'dr-sh5-ci19', 'https://drive.google.com/drive/folders/dr-sh5-ci19'),
  -- ci-1 also linked to a future shoot (one item, two shoots)
  ('sh-6', 'ci-1',  'smile-makeover-ba', 'dr-sh6-ci1',  'https://drive.google.com/drive/folders/dr-sh6-ci1');

-- ── Upload Sessions ──────────────────────────────────────────────────────
insert into upload_sessions (id, agency_id, shoot_id, content_item_id, file_name, file_size_bytes, mime_type, session_uri_enc, bytes_received, status, expires_at, started_by, completed_at) values
  -- Complete session
  ('us-1', 'ag-1', 'sh-1', 'ci-1', 'raw_sh1_001.mp4',    5368709120, 'video/mp4',  'enc://complete-session', 5368709120, 'complete', '2026-09-29T14:00:00Z', 'u-7', '2026-09-22T14:30:00Z'),
  -- Active at 63%
  ('us-2', 'ag-1', 'sh-1', 'ci-2', 'raw_sh1_002.mp4',    3221225472, 'video/mp4',  'enc://active-session',   2030045184, 'active',   '2026-09-29T10:00:00Z', 'u-7', null),
  -- Expired
  ('us-3', 'ag-1', 'sh-2', 'ci-4', 'raw_sh2_001.mp4',    2684354560, 'video/mp4',  'enc://expired-session',  536870912,  'expired',  '2026-09-19T12:00:00Z', 'u-7', null);

-- ── Raw Files ────────────────────────────────────────────────────────────
insert into raw_files (id, agency_id, shoot_id, content_item_id, drive_file_id, drive_link, file_name, size_bytes, mime_type, source) values
  ('rf-1', 'ag-1', 'sh-1', 'ci-1', 'drive-file-raw-001', 'https://drive.google.com/file/d/drive-file-raw-001', 'raw_sh1_001.mp4', 5368709120, 'video/mp4', 'wrapper'),
  ('rf-2', 'ag-1', 'sh-1', 'ci-2', 'drive-file-raw-002', 'https://drive.google.com/file/d/drive-file-raw-002', 'raw_sh1_002a.mp4', 2147483648, 'video/mp4', 'wrapper'),
  ('rf-3', 'ag-1', 'sh-1', 'ci-2', 'drive-file-raw-003', 'https://drive.google.com/file/d/drive-file-raw-003', 'raw_sh1_002b.mp4', 1073741824, 'video/mp4', 'wrapper');

-- ── Deliverable Versions ─────────────────────────────────────────────────
insert into deliverable_versions (id, agency_id, content_item_id, version, b2_key, file_size_bytes, duration_seconds, uploaded_by, status) values
  -- Full revision loop (ci-1)
  ('dv-1', 'ag-1', 'ci-1', 1, 'b2/cuts/ci-1/v1.mp4',  52428800, 45, 'u-5', 'changes_requested'),
  ('dv-2', 'ag-1', 'ci-1', 2, 'b2/cuts/ci-1/v2.mp4',  55050240, 47, 'u-5', 'internally_approved'),
  ('dv-3', 'ag-1', 'ci-1', 3, 'b2/cuts/ci-1/v3.mp4',  55706624, 48, 'u-5', 'submitted'),
  -- Single approved (ci-6)
  ('dv-4', 'ag-1', 'ci-6', 1, 'b2/cuts/ci-6/v1.mp4',  48184320, 30, 'u-5', 'client_approved'),
  -- Submitted (ci-11)
  ('dv-5', 'ag-1', 'ci-11', 1, 'b2/cuts/ci-11/v1.mp4', 67108864, 60, 'u-5', 'submitted'),
  ('dv-6', 'ag-1', 'ci-14', 1, 'b2/cuts/ci-14/v1.mp4', 50331648, 35, 'u-5', 'changes_requested'),
  ('dv-7', 'ag-1', 'ci-18', 1, 'b2/cuts/ci-18/v1.mp4', 47185920, 25, 'u-6', 'internally_approved');

-- ── Comments ─────────────────────────────────────────────────────────────
insert into comments (id, agency_id, version_id, author_id, author_label, timestamp_start, timestamp_end, body, voice_note_key, transcript, source, resolved_at) values
  ('cm-1', 'ag-1', 'dv-1', 'u-2', 'Jaspreet Kaur',  12.0, 18.0, 'Can we make the before shot brighter?', null, null, 'internal', '2026-09-18T10:00:00Z'),
  ('cm-2', 'ag-1', 'dv-2', 'u-5', 'Rohit Bansal',    30.0, 35.0, 'Audio levels are off in the second half.', null, null, 'internal', null),
  ('cm-3', 'ag-1', 'dv-2', 'u-2', 'Jaspreet Kaur',   0.0,  5.0, 'Opening text is cut off.', 'vn-001', 'Opening text is cut off, please fix.', 'internal', null),
  ('cm-4', 'ag-1', 'dv-3', 'u-2', 'Jaspreet Kaur',   null, null, 'Looks good now. Sending to client.', null, null, 'internal', null),
  ('cm-5', 'ag-1', 'dv-4', null, 'Ramana Dental',    5.0, 12.0, 'Love the before/after transition!', null, null, 'client', null),
  ('cm-6', 'ag-1', 'dv-6', null, 'Khanna Jewellers',  0.0,  8.0, 'Can you add our new tagline at the end?', null, null, 'client', null),
  ('cm-7', 'ag-1', 'dv-2', 'u-3', 'Nikhil Sharma',  15.0, 22.0, 'Brand colors feel off here.', null, null, 'internal', '2026-09-19T08:00:00Z');

-- ── Approval Links ───────────────────────────────────────────────────────
insert into approval_links (id, agency_id, content_item_id, version_id, token_hash, pin_hash, expires_at, revoked_at, viewed_at, responded_at, response, client_name, created_by) values
  ('al-1', 'ag-1', 'ci-1', 'dv-2', 'hash-active-token',   'hash-active-pin',   '2026-10-01T00:00:00Z', null, null, null, null, 'Ramana Dental', 'u-2'),
  ('al-2', 'ag-1', 'ci-6', 'dv-4', 'hash-expired-token',  'hash-expired-pin',  '2026-09-15T00:00:00Z', null, null, null, null, 'Ramana Dental', 'u-2'),
  ('al-3', 'ag-1', 'ci-14','dv-6', 'hash-revoked-token',   'hash-revoked-pin',  '2026-10-15T00:00:00Z', '2026-09-16T00:00:00Z', null, null, null, 'Khanna Jewellers', 'u-3'),
  ('al-4', 'ag-1', 'ci-18','dv-7', 'hash-responded-token', 'hash-responded-pin', '2026-10-10T00:00:00Z', null, '2026-09-17T08:00:00Z', '2026-09-17T08:30:00Z', 'changes', 'Basil Cafe', 'u-4');

-- ── Post Schedule ────────────────────────────────────────────────────────
insert into post_schedule (id, agency_id, content_item_id, scheduled_at, caption, bg_music_ref, posted_at, posted_by) values
  -- Posted
  ('ps-1', 'ag-1', 'ci-6',  '2026-09-02T10:00:00Z', 'Walk through our new showroom!', 'trending-audio-01', '2026-09-02T10:05:00Z', 'u-2'),
  ('ps-2', 'ag-1', 'ci-8',  '2026-09-04T11:00:00Z', 'What our customers say', 'feel-good-03', '2026-09-04T11:02:00Z', 'u-2'),
  ('ps-3', 'ag-1', 'ci-9',  '2026-09-08T13:00:00Z', 'Diwali offers are here!', 'festive-beat-01', '2026-09-08T13:01:00Z', 'u-3'),
  ('ps-4', 'ag-1', 'ci-10', '2026-09-10T15:00:00Z', 'Behind the scenes at Grover Motors', null, '2026-09-10T15:00:00Z', 'u-3'),
  ('ps-5', 'ag-1', 'ci-15', '2026-09-07T10:00:00Z', 'Today''s gold rates at Khanna Jewellers', null, '2026-09-07T10:00:00Z', 'u-3'),
  ('ps-6', 'ag-1', 'ci-17', '2026-09-10T12:00:00Z', 'The art of custom design', 'craft-audio-02', '2026-09-10T12:01:00Z', 'u-3'),
  ('ps-7', 'ag-1', 'ci-20', '2026-09-05T11:00:00Z', 'Weekend brunch at Basil Cafe', 'chill-vibes-05', '2026-09-05T11:00:00Z', 'u-4'),
  ('ps-8', 'ag-1', 'ci-21', '2026-09-06T12:00:00Z', 'Latte art series — part 1', 'coffee-jazz-01', '2026-09-06T12:00:00Z', 'u-4'),
  -- Scheduled (future)
  ('ps-9', 'ag-1', 'ci-5',  '2026-09-26T16:00:00Z', 'New patient special at Ramana Dental', 'reel-audio-12', null, null),
  ('ps-10', 'ag-1', 'ci-7',  '2026-10-05T09:00:00Z', 'Our service packages explained', 'carousel-bg-01', null, null),
  ('ps-11', 'ag-1', 'ci-16', '2026-09-28T11:00:00Z', 'Bridal collection — now available', null, null, null),
  ('ps-12', 'ag-1', 'ci-25', '2026-10-08T09:00:00Z', 'Dental tips for October', null, null, null),
  ('ps-13', 'ag-1', 'ci-27', '2026-09-24T11:00:00Z', 'Coffee origins — where we source', null, null, null);

-- ── Library Assets ────────────────────────────────────────────────────────
insert into library_assets (id, agency_id, client_id, folder_name, name, b2_key, kind, file_size_bytes, uploaded_by) values
  ('la-1', 'ag-1', 'cl-1', 'brand-assets', 'Ramana Dental logo.png',       'b2/lib/cl-1/logo.png',        'image',     524288,  'u-2'),
  ('la-2', 'ag-1', 'cl-1', 'raw-uploads',  'sh1_raw_001.mp4',              'b2/lib/cl-1/sh1_raw.mp4',     'video',    1073741824, 'u-7'),
  ('la-3', 'ag-1', 'cl-1', 'reference',    'competitor-ad-rdental.mp4',    'b2/lib/cl-1/ref1.mp4',        'video',    52428800,  'u-2'),
  ('la-4', 'ag-1', 'cl-2', 'brand-assets', 'Grover Motors logo.png',       'b2/lib/cl-2/logo.png',        'image',     419430,  'u-2'),
  ('la-5', 'ag-1', 'cl-2', 'raw-uploads',  'showroom_aerial.mp4',          'b2/lib/cl-2/aerial.mp4',      'video',    2147483648, 'u-7'),
  ('la-6', 'ag-1', 'cl-2', 'reference',    'car-ad-reference.mp4',         'b2/lib/cl-2/ref1.mp4',        'video',    31457280,  'u-2'),
  ('la-7', 'ag-1', 'cl-3', 'brand-assets', 'Sandhu Interiors logo.png',    'b2/lib/cl-3/logo.png',        'image',     481280,  'u-3'),
  ('la-8', 'ag-1', 'cl-3', 'raw-uploads',  'kitchen_pan.mp4',              'b2/lib/cl-3/pan.mp4',         'video',    1610612736, 'u-8'),
  ('la-9', 'ag-1', 'cl-3', 'reference',    'interior-trends-2026.pdf',     'b2/lib/cl-3/ref1.pdf',        'document',  2097152,  'u-3'),
  ('la-10', 'ag-1', 'cl-4', 'brand-assets', 'Khanna Jewellers logo.png',    'b2/lib/cl-4/logo.png',        'image',     557056,  'u-3'),
  ('la-11', 'ag-1', 'cl-4', 'raw-uploads',  'jewellery_closeup.mp4',        'b2/lib/cl-4/closeup.mp4',     'video',    536870912,  'u-7'),
  ('la-12', 'ag-1', 'cl-4', 'reference',    'bridal-trends-mag.pdf',        'b2/lib/cl-4/ref1.pdf',        'document',  4194304,  'u-3'),
  ('la-13', 'ag-1', 'cl-5', 'brand-assets', 'Basil Cafe logo.png',          'b2/lib/cl-5/logo.png',        'image',     393216,  'u-4'),
  ('la-14', 'ag-1', 'cl-5', 'raw-uploads',  'barista_pour.mp4',             'b2/lib/cl-5/pour.mp4',        'video',    268435456,  'u-7'),
  ('la-15', 'ag-1', 'cl-5', 'reference',    'menu-design-v3.psd',           'b2/lib/cl-5/menu.psd',        'document',  15728640,  'u-4'),
  ('la-16', 'ag-1', 'cl-6', 'brand-assets', 'Verdant Gym logo.png',         'b2/lib/cl-6/logo.png',        'image',     368640,  'u-4');

-- ── Drive Sync State ─────────────────────────────────────────────────────
insert into drive_sync_state (agency_id, shared_drive_id, page_token, last_polled_at) values
  ('ag-1', '0AP7brx1a8226Uk9PVA', 'page-token-ashmeet', '2026-10-02T05:00:00Z');
