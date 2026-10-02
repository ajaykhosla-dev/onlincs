-- Migration: 001_init
-- Phase 0: Core schema for Ashmeet SMMA

-- ── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- ── Enable RLS by default ──────────────────────────────────────────────────
alter database postgres set row_security = on;

-- ── Tenancy and identity ──────────────────────────────────────────────────

create table agencies (
  id          text primary key,
  name        text not null,
  slug        text unique not null,
  status      text not null default 'active' check (status in ('active', 'suspended', 'trial')),
  logo_url    text,
  created_at  timestamptz not null default now()
);

create table agency_integrations (
  agency_id                    text primary key references agencies(id),
  drive_service_account_email  text not null,
  drive_service_account_key_enc text not null,
  shared_drive_id              text not null,
  b2_bucket                    text,
  b2_prefix                    text,
  b2_key_id_enc                text,
  b2_application_key_enc       text,
  updated_at                   timestamptz not null default now()
);

create table users (
  id                text primary key,
  agency_id         text not null references agencies(id),
  email             text not null,
  full_name         text not null,
  initials          text not null,
  role              text not null check (role in ('platform_owner', 'admin', 'brand_manager', 'editor', 'cameraman', 'client_viewer')),
  avatar_gradient   text not null,
  phone             text,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  unique (agency_id, email)
);

-- ── Clients and scope ──────────────────────────────────────────────────────

create table clients (
  id            text primary key,
  agency_id     text not null references agencies(id),
  code          text not null,
  name          text not null,
  handle        text not null,
  niche         text not null,
  manager_id    text references users(id),
  status        text not null default 'active' check (status in ('active', 'onboarding', 'paused', 'churned')),
  onboarded_at  timestamptz,
  drive_folder_id text,
  created_at    timestamptz not null default now(),
  unique (agency_id, code)
);

create table client_scope (
  id          text primary key,
  agency_id   text not null references agencies(id),
  client_id   text not null references clients(id),
  month       date not null,
  reel_count  integer not null default 0,
  post_count  integer not null default 0,
  carousel_count integer not null default 0,
  story_count integer not null default 0,
  notes       text,
  created_at  timestamptz not null default now(),
  unique (client_id, month)
);

-- ── Pipeline spine ─────────────────────────────────────────────────────────

create type content_status as enum (
  'planned', 'calendar_approved', 'shoot_scheduled', 'raw_uploaded',
  'with_editor', 'cut_submitted', 'changes_requested', 'internally_approved',
  'with_client', 'client_changes', 'client_approved', 'scheduled', 'posted', 'archived'
);

create type content_type as enum ('reel', 'post', 'carousel', 'story');

create table content_items (
  id                    text primary key,
  agency_id             text not null references agencies(id),
  client_id             text not null references clients(id),
  title                 text not null,
  slug                  text not null,
  type                  content_type not null,
  concept               text,
  script                text,
  instructions_editor   text,
  instructions_cameraman text,
  reference_links       jsonb default '[]'::jsonb,
  planned_date          date,
  planned_time          text,
  status                content_status not null default 'planned',
  assigned_editor_id    text references users(id),
  deadline              date,
  created_by            text not null references users(id),
  updated_at            timestamptz not null default now(),
  created_at            timestamptz not null default now(),
  unique (agency_id, slug)
);

create table monthly_plans (
  id          text primary key,
  agency_id   text not null references agencies(id),
  client_id   text not null references clients(id),
  month       date not null,
  status      text not null default 'draft' check (status in ('draft', 'sent_to_client', 'approved', 'rejected')),
  approved_at timestamptz,
  notes       text,
  created_at  timestamptz not null default now(),
  unique (client_id, month)
);

create type shoot_status as enum ('scheduled', 'completed', 'raw_uploaded', 'cancelled');

create table shoots (
  id                text primary key,
  agency_id         text not null references agencies(id),
  client_id         text not null references clients(id),
  title             text not null,
  scheduled_start   timestamptz not null,
  scheduled_end     timestamptz not null,
  location          text,
  cameraman_id      text references users(id),
  status            shoot_status not null default 'scheduled',
  drive_folder_id   text,
  drive_folder_link text,
  raw_detected_at   timestamptz,
  created_by        text not null references users(id),
  created_at        timestamptz not null default now()
);

create table shoot_items (
  shoot_id          text not null references shoots(id),
  content_item_id   text not null references content_items(id),
  idea_slug         text,
  drive_subfolder_id text,
  drive_subfolder_link text,
  raw_uploaded_at   timestamptz,
  marked_by         text references users(id),
  primary key (shoot_id, content_item_id)
);

-- ── Raw uploads ────────────────────────────────────────────────────────────

create type session_status as enum ('active', 'complete', 'expired', 'failed');

create table upload_sessions (
  id                text primary key,
  agency_id         text not null references agencies(id),
  shoot_id          text not null references shoots(id),
  content_item_id   text not null references content_items(id),
  file_name         text not null,
  file_size_bytes   bigint,
  mime_type         text,
  session_uri_enc   text not null,
  bytes_received    bigint not null default 0,
  status            session_status not null default 'active',
  expires_at        timestamptz not null,
  started_by        text not null references users(id),
  completed_at      timestamptz,
  created_at        timestamptz not null default now(),
  foreign key (shoot_id, content_item_id) references shoot_items(shoot_id, content_item_id)
);

create table raw_files (
  id              text primary key,
  agency_id       text not null references agencies(id),
  shoot_id        text not null references shoots(id),
  content_item_id text references content_items(id),
  drive_file_id   text unique not null,
  drive_link      text not null,
  file_name       text not null,
  size_bytes      bigint not null,
  mime_type       text not null,
  uploaded_at     timestamptz not null default now(),
  source          text not null default 'wrapper'
);

-- ── Edited media and review ────────────────────────────────────────────────

create type version_status as enum ('submitted', 'changes_requested', 'internally_approved', 'client_approved');

create table deliverable_versions (
  id              text primary key,
  agency_id       text not null references agencies(id),
  content_item_id text not null references content_items(id),
  version         integer not null,
  b2_key          text not null,
  file_size_bytes bigint not null,
  duration_seconds integer,
  uploaded_by     text not null references users(id),
  uploaded_at     timestamptz not null default now(),
  status          version_status not null default 'submitted',
  unique (content_item_id, version)
);

create type comment_source as enum ('internal', 'client');

create table comments (
  id              text primary key,
  agency_id       text not null references agencies(id),
  version_id      text not null,
  author_id       text references users(id),
  author_label    text not null,
  timestamp_start numeric,
  timestamp_end   numeric,
  body            text not null,
  voice_note_key  text,
  transcript      text,
  source          comment_source not null default 'internal',
  resolved_at     timestamptz,
  created_at      timestamptz not null default now()
);

create table approval_links (
  id              text primary key,
  agency_id       text not null references agencies(id),
  content_item_id text not null references content_items(id),
  version_id      text not null,
  token_hash      text not null,
  pin_hash        text not null,
  expires_at      timestamptz not null,
  revoked_at      timestamptz,
  viewed_at       timestamptz,
  responded_at    timestamptz,
  response        text check (response in ('approved', 'changes')),
  client_name     text not null,
  created_by      text not null references users(id),
  created_at      timestamptz not null default now()
);

create table post_schedule (
  id              text primary key,
  agency_id       text not null references agencies(id),
  content_item_id text not null references content_items(id),
  scheduled_at    timestamptz not null,
  caption         text,
  bg_music_ref    text,
  posted_at       timestamptz,
  posted_by       text references users(id),
  created_at      timestamptz not null default now()
);

create table library_assets (
  id            text primary key,
  agency_id     text not null references agencies(id),
  client_id     text not null references clients(id),
  folder_name   text not null,
  name          text not null,
  b2_key        text not null,
  kind          text not null check (kind in ('video', 'image', 'audio', 'document')),
  file_size_bytes bigint,
  uploaded_by   text not null references users(id),
  created_at    timestamptz not null default now()
);

-- ── System ─────────────────────────────────────────────────────────────────

create type actor_type as enum ('user', 'system', 'client');

create table activity_log (
  id          text primary key,
  agency_id   text not null references agencies(id),
  actor_id    text references users(id),
  actor_type  actor_type not null default 'user',
  entity_type text not null,
  entity_id   text not null,
  action      text not null,
  from_state  text,
  to_state    text,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

create table drive_sync_state (
  agency_id       text primary key references agencies(id),
  shared_drive_id text not null,
  page_token      text,
  last_polled_at  timestamptz
);

create table push_subscriptions (
  id          text primary key,
  agency_id   text not null references agencies(id),
  user_id     text not null references users(id),
  endpoint    text unique not null,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);

create table notifications (
  id          text primary key,
  agency_id   text not null references agencies(id),
  user_id     text not null references users(id),
  type        text not null,
  title       text not null,
  body        text,
  link        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- ── Indexes ────────────────────────────────────────────────────────────────

create index idx_users_agency on users(agency_id);
create index idx_clients_agency on clients(agency_id);
create index idx_clients_manager on clients(manager_id);
create index idx_client_scope_agency on client_scope(agency_id);
create index idx_content_items_agency on content_items(agency_id);
create index idx_content_items_client_status on content_items(client_id, status);
create index idx_content_items_planned_date on content_items(planned_date);
create index idx_content_items_editor on content_items(assigned_editor_id);
create index idx_monthly_plans_agency on monthly_plans(agency_id);
create index idx_monthly_plans_client on monthly_plans(client_id);
create index idx_shoots_agency on shoots(agency_id);
create index idx_shoots_cameraman on shoots(cameraman_id);
create index idx_shoots_scheduled on shoots(scheduled_start);
create index idx_shoot_items_shoot on shoot_items(shoot_id);
create index idx_upload_sessions_shoot_item on upload_sessions(shoot_id, content_item_id);
create index idx_upload_sessions_agency on upload_sessions(agency_id);
create index idx_raw_files_drive_file on raw_files(drive_file_id);
create index idx_raw_files_agency on raw_files(agency_id);
create index idx_deliverable_versions_agency on deliverable_versions(agency_id);
create index idx_deliverable_versions_content on deliverable_versions(content_item_id);
create index idx_comments_agency on comments(agency_id);
create index idx_comments_version on comments(version_id);
create index idx_approval_links_token on approval_links(token_hash);
create index idx_approval_links_content on approval_links(content_item_id);
create index idx_post_schedule_agency on post_schedule(agency_id);
create index idx_post_schedule_content on post_schedule(content_item_id);
create index idx_library_assets_agency on library_assets(agency_id);
create index idx_library_assets_client on library_assets(client_id);
create index idx_activity_log_agency on activity_log(agency_id);
create index idx_activity_log_entity on activity_log(entity_type, entity_id);
create index idx_notifications_agency on notifications(agency_id);
create index idx_notifications_user on notifications(user_id, read_at);
