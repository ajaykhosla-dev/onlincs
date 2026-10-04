// ── Role ───────────────────────────────────────────────────────────────────────
export type Role =
  | 'admin'
  | 'brand_manager'
  | 'editor'
  | 'cameraman'
  | 'client_viewer'
  | 'platform_owner'

// ── Agency ────────────────────────────────────────────────────────────────────
export interface Agency {
  id: string
  name: string
  slug: string
  status: AgencyStatus
  logo_url: string | null
  created_at: string
}

// ── ContentType ───────────────────────────────────────────────────────────────
export type ContentType = 'post' | 'reel' | 'carousel' | 'story'

// ── ContentStatus ─────────────────────────────────────────────────────────────
export type ContentStatus =
  | 'planned'
  | 'calendar_approved'
  | 'shoot_scheduled'
  | 'raw_uploaded'
  | 'with_editor'
  | 'cut_submitted'
  | 'changes_requested'
  | 'internally_approved'
  | 'with_client'
  | 'client_changes'
  | 'client_approved'
  | 'scheduled'
  | 'posted'
  | 'archived'

// ── ShootState ────────────────────────────────────────────────────────────────
export type ShootState =
  | 'scheduled'
  | 'completed'
  | 'raw_uploaded'
  | 'cancelled'

// ── VersionStatus ─────────────────────────────────────────────────────────────
export type VersionStatus =
  | 'cut_submitted'
  | 'internally_approved'
  | 'submitted'
  | 'client_approved'
  | 'changes_requested'

// ── AgencyStatus ──────────────────────────────────────────────────────────────
export type AgencyStatus = 'active' | 'suspended' | 'trial'

// ── ClientStatus ──────────────────────────────────────────────────────────────
export type ClientStatus = 'active' | 'onboarding' | 'paused' | 'churned'

// ── PlanStatus ────────────────────────────────────────────────────────────────
export type PlanStatus =
  | 'draft'
  | 'sent_to_client'
  | 'approved'
  | 'changes_requested'

// ── SessionStatus ─────────────────────────────────────────────────────────────
export type SessionStatus =
  | 'active'
  | 'expired'
  | 'revoked'
  | 'completed'

// ── SourceType ────────────────────────────────────────────────────────────────
export type SourceType = 'upload' | 'camera_capture' | 'library_import' | 'internal' | 'client'

// ── ActorType ─────────────────────────────────────────────────────────────────
export type ActorType = 'agency' | 'client'

// ── ApprovalResponse ──────────────────────────────────────────────────────────
export type ApprovalResponse = 'approved' | 'changes_requested' | 'viewed'

// ── User ──────────────────────────────────────────────────────────────────────
export interface User {
  id: string
  agency_id: string
  email: string
  full_name: string
  initials: string
  role: Role
  avatar_gradient: string
  phone: string | null
  is_active: boolean
  created_at?: string
  updated_at?: string
}

// ── Client ────────────────────────────────────────────────────────────────────
export interface Client {
  id: string
  agency_id: string
  code: string
  name: string
  handle: string
  niche: string
  manager_id: string
  status: ClientStatus
  onboarded_at: string | null
  drive_folder_id: string | null
  created_at?: string
  updated_at?: string
}

// ── ContentItem ───────────────────────────────────────────────────────────────
export interface ContentItem {
  id: string
  agency_id: string
  client_id: string
  title: string
  slug: string
  type: ContentType
  concept: string
  script: string
  instructions_editor: string
  instructions_cameraman: string
  reference_links: string[]
  planned_date: string | null
  planned_time: string | null
  status: ContentStatus
  assigned_editor_id: string | null
  deadline: string | null
  created_by: string
  updated_at: string
  created_at?: string
}

// ── Shoot ─────────────────────────────────────────────────────────────────────
export interface Shoot {
  id: string
  agency_id: string
  client_id: string
  title: string
  scheduled_start: string
  scheduled_end: string
  location: string
  cameraman_id: string
  status: ShootState
  drive_folder_id: string | null
  drive_folder_link: string | null
  raw_detected_at: string | null
  created_by: string
  created_at?: string
  updated_at?: string
}

// ── ShootItem ─────────────────────────────────────────────────────────────────
export interface ShootItem {
  shoot_id: string
  content_item_id: string
  idea_slug: string
  drive_subfolder_id?: string | null
  drive_subfolder_link?: string | null
  raw_uploaded_at?: string | null
  marked_by?: string | null
}

// ── DeliverableVersion ────────────────────────────────────────────────────────
export interface DeliverableVersion {
  id: string
  agency_id: string
  content_item_id: string
  version: number
  b2_key: string
  file_size_bytes: number
  duration_seconds: number | null
  uploaded_by: string
  uploaded_at: string
  status: VersionStatus
  created_at?: string
}

// ── Comment ───────────────────────────────────────────────────────────────────
export interface Comment {
  id: string
  agency_id: string
  version_id: string
  author_id: string | null
  author_label: string
  timestamp_start: number | null
  timestamp_end: number | null
  body: string
  voice_note_key: string | null
  transcript: string | null
  source: SourceType
  resolved_at: string | null
  created_at?: string
}

// ── ApprovalLink ──────────────────────────────────────────────────────────────
export interface ApprovalLink {
  id: string
  agency_id: string
  content_item_id: string
  version_id: string
  token_hash: string
  pin_hash: string
  expires_at: string
  revoked_at: string | null
  viewed_at: string | null
  responded_at: string | null
  response: ApprovalResponse | null
  client_name: string
  created_by: string
  created_at?: string
}

// ── PostSchedule ──────────────────────────────────────────────────────────────
export interface PostSchedule {
  id: string
  agency_id: string
  content_item_id: string
  scheduled_at: string
  caption: string
  bg_music_ref: string | null
  posted_at: string | null
  posted_by: string | null
  created_at?: string
}

// ── ActivityLog ───────────────────────────────────────────────────────────────
export interface ActivityLog {
  id: string
  agency_id: string
  actor_id: string
  actor_type: ActorType
  action: string
  entity_type: string
  entity_id: string
  metadata: Record<string, unknown> | null
  created_at: string
}

// ── LibraryAsset ──────────────────────────────────────────────────────────────
export interface LibraryAsset {
  id: string
  agency_id: string
  client_id: string
  folder_name: string
  name: string
  b2_key: string
  kind: 'video' | 'image' | 'audio' | 'document'
  file_size_bytes: number
  uploaded_by: string
  created_at?: string
}

// ── ClientScope ───────────────────────────────────────────────────────────────
export interface ClientScope {
  id: string
  agency_id: string
  client_id: string
  month: string // YYYY-MM-01
  reel_count: number
  post_count: number
  carousel_count: number
  story_count: number
  notes: string | null
  created_at?: string
  updated_at?: string
}

// ── MonthlyPlan ───────────────────────────────────────────────────────────────
export interface MonthlyPlan {
  id: string
  agency_id: string
  client_id: string
  month: string // YYYY-MM-01
  status: PlanStatus
  approved_at: string | null
  notes: string | null
  created_at?: string
  updated_at?: string
}

// ── RawFile ───────────────────────────────────────────────────────────────────
export interface RawFile {
  id: string
  agency_id: string
  shoot_id: string
  content_item_id?: string | null
  drive_file_id?: string
  drive_link?: string
  filename: string
  b2_key?: string
  size_bytes?: number
  file_size_bytes: number
  mime_type: string
  uploaded_by: string
  uploaded_at: string
  source?: string
  source_type?: string
  created_at?: string
}

// ── UploadSession ─────────────────────────────────────────────────────────────
export interface UploadSession {
  id: string
  agency_id: string
  shoot_id: string
  status: SessionStatus
  file_count: number
  total_bytes: number
  created_by: string
  completed_at: string | null
  created_at?: string
  updated_at?: string
}
