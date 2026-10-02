-- Migration: 002_seed
-- Phase 0: Seed data for Ashmeet SMMA
-- Anchor date: 23 September 2026

-- ── Agencies ──────────────────────────────────────────────────────────────
insert into agencies (id, name, slug, status) values
  ('ag-1', 'Ashmeet SMMA', 'ashmeet-smma', 'active'),
  ('ag-2', 'Northside Social', 'northside-social', 'active');

-- ── Users ─────────────────────────────────────────────────────────────────
insert into users (id, agency_id, email, full_name, initials, role, avatar_gradient, phone, is_active) values
  -- Ashmeet SMMA
  ('u-1', 'ag-1', 'ashmeet@onlincs.com', 'Ashmeet Chaurasia', 'AC', 'admin', 'linear-gradient(140deg,#8F80F7,#5A4AD8)', '+919876543210', true),
  ('u-2', 'ag-1', 'jaspreet@ashmeetsmma.com', 'Jaspreet Kaur', 'JK', 'brand_manager', 'linear-gradient(140deg,#8F80F7,#5A4AD8)', '+919876543211', true),
  ('u-3', 'ag-1', 'nikhil@ashmeetsmma.com', 'Nikhil Sharma', 'NS', 'brand_manager', 'linear-gradient(140deg,#F8A0BC,#DF5A86)', '+919876543212', true),
  ('u-4', 'ag-1', 'manreet@ashmeetsmma.com', 'Manreet Gill', 'MG', 'brand_manager', 'linear-gradient(140deg,#63DCA9,#1FA772)', '+919876543213', true),
  ('u-5', 'ag-1', 'rohit@ashmeetsmma.com', 'Rohit Bansal', 'RB', 'editor', 'linear-gradient(140deg,#62A0F2,#14539F)', '+919876543214', true),
  ('u-6', 'ag-1', 'simran@ashmeetsmma.com', 'Simran Kaur', 'SK', 'editor', 'linear-gradient(140deg,#F8A0BC,#DF5A86)', '+919876543215', true),
  ('u-7', 'ag-1', 'harpreet@ashmeetsmma.com', 'Harpreet Singh', 'HS', 'cameraman', 'linear-gradient(140deg,#8F80F7,#5A4AD8)', '+919876543216', true),
  ('u-8', 'ag-1', 'vikram@ashmeetsmma.com', 'Vikram Rana', 'VR', 'cameraman', 'linear-gradient(140deg,#63DCA9,#1FA772)', '+919876543217', true),
  -- Northside Social
  ('u-9', 'ag-2', 'admin@northside.com', 'Northside Admin', 'NA', 'admin', 'linear-gradient(140deg,#8F80F7,#5A4AD8)', '+919876500001', true),
  ('u-10', 'ag-2', 'bm@northside.com', 'Northside BM', 'NB', 'brand_manager', 'linear-gradient(140deg,#8F80F7,#5A4AD8)', '+919876500002', true),
  ('u-11', 'ag-2', 'editor@northside.com', 'Northside Editor', 'NE', 'editor', 'linear-gradient(140deg,#62A0F2,#14539F)', '+919876500003', true),
  ('u-12', 'ag-2', 'cam@northside.com', 'Northside Cameraman', 'NC', 'cameraman', 'linear-gradient(140deg,#63DCA9,#1FA772)', '+919876500004', true),
  ('u-13', 'ag-2', 'ed2@northside.com', 'Northside Editor 2', 'N2', 'editor', 'linear-gradient(140deg,#F8A0BC,#DF5A86)', '+919876500005', true),
  ('u-14', 'ag-2', 'cam2@northside.com', 'Northside Cameraman 2', 'N3', 'cameraman', 'linear-gradient(140deg,#8F80F7,#5A4AD8)', '+919876500006', true);

-- ── Clients ────────────────────────────────────────────────────────────────
insert into clients (id, agency_id, code, name, handle, niche, manager_id, status, onboarded_at, drive_folder_id) values
  ('cl-1', 'ag-1', 'RAM-01', 'Ramana Dental', '@ramanadental', 'Healthcare', 'u-2', 'active', '2026-08-01', null),
  ('cl-2', 'ag-1', 'GRV-02', 'Grover Motors', '@grovermotors', 'Automotive', 'u-2', 'active', '2026-07-15', null),
  ('cl-3', 'ag-1', 'SDH-03', 'Sandhu Interiors', '@sandhu.interiors', 'Interiors', 'u-3', 'active', '2026-08-10', null),
  ('cl-4', 'ag-1', 'KHN-04', 'Khanna Jewellers', '@khannajewellers', 'Retail', 'u-3', 'active', '2026-09-01', null),
  ('cl-5', 'ag-1', 'BSL-05', 'Basil Cafe', '@basil.ldh', 'Food & Beverage', 'u-4', 'active', '2026-08-20', null),
  ('cl-6', 'ag-1', 'VRD-06', 'Verdant Gym', '@verdant.fit', 'Fitness', 'u-4', 'onboarding', '2026-09-15', null);

-- ── Client Scope (September 2026) ────────────────────────────────────────
insert into client_scope (id, agency_id, client_id, month, reel_count, post_count, carousel_count, story_count, notes) values
  ('cs-1', 'ag-1', 'cl-1', '2026-09-01', 6, 8, 3, 3, null),
  ('cs-2', 'ag-1', 'cl-2', '2026-09-01', 5, 8, 4, 3, null),
  ('cs-3', 'ag-1', 'cl-3', '2026-09-01', 4, 6, 3, 3, null),
  ('cs-4', 'ag-1', 'cl-4', '2026-09-01', 5, 7, 3, 3, null),
  ('cs-5', 'ag-1', 'cl-5', '2026-09-01', 4, 5, 2, 1, null),
  ('cs-6', 'ag-1', 'cl-6', '2026-09-01', 2, 3, 3, 2, 'Onboarding — reduced scope for first month');

-- ── Content Items ────────────────────────────────────────────────────────
-- statuses: planned, calendar_approved, shoot_scheduled, raw_uploaded, with_editor,
--           cut_submitted, changes_requested, internally_approved, with_client,
--           client_changes, client_approved, scheduled, posted, archived
insert into content_items
  (id, agency_id, client_id, title, slug, type, concept, status, planned_date, planned_time, deadline, assigned_editor_id, created_by, updated_at, created_at)
values
  -- Ramana Dental (cl-1) — SoW: 20, Delivered: 14
  ('ci-1',  'ag-1', 'cl-1', 'Smile makeover before/after reel', 'ci-ramanadental-001', 'reel',        'Before/after transformation reel', 'with_editor', '2026-09-10', '09:00', '2026-09-18', 'u-5', 'u-2', '2026-09-23T10:00:00Z', '2026-09-01T09:00:00Z'),
  ('ci-2',  'ag-1', 'cl-1', 'Root canal myths busted',      'ci-ramanadental-002', 'reel',        'Myth-busting educational reel',    'with_client', '2026-09-12', '14:00', '2026-09-20', 'u-5', 'u-2', '2026-09-23T10:00:00Z', '2026-09-01T09:30:00Z'),
  ('ci-3',  'ag-1', 'cl-1', 'Why Ramana Dental?',           'ci-ramanadental-003', 'post',        'Brand trust testimonial',           'internally_approved', '2026-09-08', '10:00', '2026-09-16', 'u-5', 'u-2', '2026-09-23T10:00:00Z', '2026-08-25T09:00:00Z'),
  ('ci-4',  'ag-1', 'cl-1', 'Teeth whitening tips',         'ci-ramanadental-004', 'carousel',    '5 tips for whiter teeth',           'cut_submitted', '2026-09-14', '11:00', '2026-09-22', 'u-5', 'u-2', '2026-09-23T10:00:00Z', '2026-09-03T08:00:00Z'),
  ('ci-5',  'ag-1', 'cl-1', 'New patient offer',            'ci-ramanadental-005', 'story',       'Flash discount story',              'scheduled', '2026-09-15', '16:00', '2026-09-25', 'u-5', 'u-2', '2026-09-23T10:00:00Z', '2026-09-04T09:00:00Z'),
  -- Grover Motors (cl-2) — SoW: 20, Delivered: 20 (100%)
  ('ci-6',  'ag-1', 'cl-2', 'Showroom walkthrough reel',     'ci-grovermotors-001', 'reel',        'Walkthrough of new showroom',       'posted', '2026-09-01', '10:00', '2026-09-08', 'u-5', 'u-2', '2026-09-23T10:00:00Z', '2026-09-02T10:00:00Z'),
  ('ci-7',  'ag-1', 'cl-2', 'Service package explainer',     'ci-grovermotors-002', 'reel',        'Packages breakdown reel',           'scheduled', '2026-09-05', '09:00', '2026-09-12', 'u-6', 'u-2', '2026-09-23T10:00:00Z', '2026-08-20T10:00:00Z'),
  ('ci-8',  'ag-1', 'cl-2', 'Testimonial — Mr. Gupta',      'ci-grovermotors-003', 'post',        'Customer testimonial post',         'posted', '2026-09-03', '11:00', '2026-09-10', 'u-6', 'u-2', '2026-09-23T10:00:00Z', '2026-08-22T09:00:00Z'),
  ('ci-9',  'ag-1', 'cl-2', 'Festival offers carousel',      'ci-grovermotors-004', 'carousel',    'Diwali offer cards',                'posted', '2026-09-07', '13:00', '2026-09-14', 'u-5', 'u-2', '2026-09-23T10:00:00Z', '2026-09-05T11:00:00Z'),
  ('ci-10', 'ag-1', 'cl-2', 'Behind the scenes',             'ci-grovermotors-005', 'story',       'Factory visit BTS',                 'posted', '2026-09-09', '15:00', '2026-09-16', 'u-6', 'u-2', '2026-09-23T10:00:00Z', '2026-09-07T10:00:00Z'),
  -- Sandhu Interiors (cl-3) — SoW: 16, Delivered: 6
  ('ci-11', 'ag-1', 'cl-3', 'Modular kitchen reveal',        'ci-sandhuinteriors-001', 'reel',      'Reveal of modular kitchen',        'raw_uploaded', '2026-09-11', '09:00', '2026-09-19', 'u-5', 'u-3', '2026-09-23T10:00:00Z', '2026-09-08T09:00:00Z'),
  ('ci-12', 'ag-1', 'cl-3', 'Client testimonial — Mrs. Bedi', 'ci-sandhuinteriors-002', 'reel',     'Testimonial video',                'shoot_scheduled', '2026-09-13', '10:00', '2026-09-21', 'u-5', 'u-3', '2026-09-23T10:00:00Z', '2026-09-09T10:00:00Z'),
  ('ci-13', 'ag-1', 'cl-3', 'Before/after living room',      'ci-sandhuinteriors-003', 'post',      'Transformation post',              'planned', '2026-09-15', '11:00', '2026-09-23', null, 'u-3', '2026-09-23T10:00:00Z', '2026-09-10T11:00:00Z'),
  -- Khanna Jewellers (cl-4) — SoW: 18, Delivered: 11, 6 days late
  ('ci-14', 'ag-1', 'cl-4', 'Diwali offer reel',             'ci-khannajewellers-001', 'reel',     'Diwali special reel',              'client_changes', '2026-09-05', '09:00', '2026-09-10', 'u-5', 'u-3', '2026-09-23T10:00:00Z', '2026-09-01T08:00:00Z'),
  ('ci-15', 'ag-1', 'cl-4', 'Gold rate update post',         'ci-khannajewellers-002', 'post',      'Daily gold rate post',             'posted', '2026-09-06', '10:00', '2026-09-11', 'u-5', 'u-3', '2026-09-23T10:00:00Z', '2026-09-02T09:00:00Z'),
  ('ci-16', 'ag-1', 'cl-4', 'Bridal collection carousel',    'ci-khannajewellers-003', 'carousel',  'New bridal range',                 'with_client', '2026-09-08', '11:00', '2026-09-13', 'u-5', 'u-3', '2026-09-23T10:00:00Z', '2026-09-03T10:00:00Z'),
  ('ci-17', 'ag-1', 'cl-4', 'Custom design reel',            'ci-khannajewellers-004', 'reel',       'Custom jewellery process',         'posted', '2026-09-09', '12:00', '2026-09-14', 'u-6', 'u-3', '2026-09-23T10:00:00Z', '2026-09-04T10:00:00Z'),
  -- Basil Cafe (cl-5) — SoW: 12, Delivered: 9
  ('ci-18', 'ag-1', 'cl-5', 'New season menu reel',          'ci-basilcafe-001', 'reel',         'New autumn menu reveal',           'internally_approved', '2026-09-07', '09:00', '2026-09-14', 'u-6', 'u-4', '2026-09-23T10:00:00Z', '2026-09-02T09:00:00Z'),
  ('ci-19', 'ag-1', 'cl-5', 'Barista''s pick',               'ci-basilcafe-002', 'reel',         'Staff favourite drinks',           'with_editor', '2026-09-10', '10:00', '2026-09-18', 'u-6', 'u-4', '2026-09-23T10:00:00Z', '2026-09-05T10:00:00Z'),
  ('ci-20', 'ag-1', 'cl-5', 'Weekend brunch post',           'ci-basilcafe-003', 'post',         'Brunch menu highlights',           'posted', '2026-09-04', '11:00', '2026-09-11', 'u-5', 'u-4', '2026-09-23T10:00:00Z', '2026-08-25T11:00:00Z'),
  ('ci-21', 'ag-1', 'cl-5', 'Latte art carousel',            'ci-basilcafe-004', 'carousel',     'Latte art series',                 'posted', '2026-09-05', '12:00', '2026-09-12', 'u-6', 'u-4', '2026-09-23T10:00:00Z', '2026-08-27T10:00:00Z'),
  -- Verdant Gym (cl-6) — SoW: 10, Delivered: 0 (onboarding)
  ('ci-22', 'ag-1', 'cl-6', 'Founder story',                 'ci-verdantgym-001', 'reel',         'Founder journey reel',             'planned', '2026-09-20', '09:00', '2026-09-28', null, 'u-4', '2026-09-23T10:00:00Z', '2026-09-13T09:00:00Z'),
  ('ci-23', 'ag-1', 'cl-6', 'Transformation Tuesday post',   'ci-verdantgym-002', 'post',         'Member transformation',            'planned', '2026-09-22', '10:00', '2026-09-30', null, 'u-4', '2026-09-23T10:00:00Z', '2026-09-14T10:00:00Z'),
  ('ci-24', 'ag-1', 'cl-6', 'Class schedule story',          'ci-verdantgym-003', 'story',        'Weekly class schedule',            'planned', '2026-09-21', '08:00', '2026-09-29', null, 'u-4', '2026-09-23T10:00:00Z', '2026-09-12T08:00:00Z'),
  -- Additional status coverage
  ('ci-25', 'ag-1', 'cl-1', 'Dental tips reel — Oct',        'ci-ramanadental-006', 'reel',         'October content',                  'planned', '2026-10-01', '09:00', '2026-10-10', null, 'u-2', '2026-09-23T10:00:00Z', '2026-09-20T09:00:00Z'),
  ('ci-26', 'ag-1', 'cl-2', 'Customer review reel',          'ci-grovermotors-006', 'reel',         'Google review compilation',        'archived', '2026-08-15', '10:00', '2026-08-22', 'u-5', 'u-2', '2026-09-23T10:00:00Z', '2026-08-10T10:00:00Z'),
  ('ci-27', 'ag-1', 'cl-5', 'Coffee origins post',           'ci-basilcafe-005', 'post',         'Single origin story',              'calendar_approved', '2026-09-18', '11:00', '2026-09-25', null, 'u-4', '2026-09-23T10:00:00Z', '2026-09-15T11:00:00Z'),
  -- Extra rows to cover statuses that only have 1 row above
  ('ci-28', 'ag-1', 'cl-2', 'Customer testimonial video',    'ci-grovermotors-007', 'reel',         'Video compilation of reviews',     'client_approved', '2026-09-11', '09:00', '2026-09-16', 'u-6', 'u-2', '2026-09-23T10:00:00Z', '2026-09-06T09:00:00Z'),
  ('ci-29', 'ag-1', 'cl-2', 'Year-end sale reel',            'ci-grovermotors-008', 'reel',         'Big sale announcement',            'scheduled', '2026-10-15', '10:00', '2026-10-20', null, 'u-5', '2026-09-23T10:00:00Z', '2026-09-15T10:00:00Z'),
  ('ci-30', 'ag-1', 'cl-5', 'Cold brew launch post',         'ci-basilcafe-006', 'post',         'New cold brew range',              'posted', '2026-09-12', '09:00', '2026-09-18', 'u-6', 'u-4', '2026-09-23T10:00:00Z', '2026-09-08T09:00:00Z'),
  ('ci-31', 'ag-1', 'cl-4', 'Festive collection post',       'ci-khannajewellers-005', 'post',     'Festive season jewellery',         'archived', '2026-08-20', '10:00', '2026-08-27', 'u-5', 'u-3', '2026-09-23T10:00:00Z', '2026-08-12T10:00:00Z'),
  ('ci-32', 'ag-1', 'cl-1', 'Teeth sensitivity tips carousel', 'ci-ramanadental-007', 'carousel',  'Sensitivity FAQ',                  'posted', '2026-09-13', '11:00', '2026-09-20', 'u-5', 'u-2', '2026-09-23T10:00:00Z', '2026-09-09T11:00:00Z'),
  ('ci-33', 'ag-1', 'cl-3', 'Home office interiors reel',    'ci-sandhuinteriors-004', 'reel',      'Work-from-home setup',             'scheduled', '2026-10-01', '09:00', '2026-10-08', null, 'u-5', '2026-09-23T10:00:00Z', '2026-09-15T10:00:00Z'),
  -- Two calendar_approved items
  ('ci-34', 'ag-1', 'cl-4', 'New arrival announcement',      'ci-khannajewellers-006', 'post',      'Latest collection drop',           'calendar_approved', '2026-09-20', '11:00', '2026-09-27', null, 'u-3', '2026-09-23T10:00:00Z', '2026-09-16T11:00:00Z'),
  -- One changes_requested after internally_approved
  ('ci-35', 'ag-1', 'cl-3', 'Walk-in wardrobe reveal',       'ci-sandhuinteriors-005', 'reel',      'Wardrobe transformation',          'changes_requested', '2026-09-14', '10:00', '2026-09-22', 'u-5', 'u-3', '2026-09-23T10:00:00Z', '2026-09-11T10:00:00Z'),
  -- Second archived (past deadline not yet posted)
  ('ci-36', 'ag-1', 'cl-1', 'Oral hygiene awareness',        'ci-ramanadental-008', 'carousel',   'Brush right campaign',             'archived', '2026-08-25', '12:00', '2026-09-01', 'u-5', 'u-2', '2026-09-23T10:00:00Z', '2026-08-20T12:00:00Z');
