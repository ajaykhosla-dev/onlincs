import 'server-only'
import { canAccess, type Action } from '@/lib/auth/can-access'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { User } from '@/types/database'

export type VersionContext = {
  version: { id: string; agency_id: string; content_item_id: string; version: number; b2_key: string; status: string }
  item: { id: string; agency_id: string; client_id: string; title: string; status: string; assigned_editor_id: string | null }
  clientManagerId: string | null
}

export async function itemContext(user: User, itemId: string, action: Action) {
  const { data: item } = await supabaseAdmin.from('content_items')
    .select('id,agency_id,client_id,title,status,assigned_editor_id').eq('id', itemId).maybeSingle()
  if (!item) return null
  const { data: client } = await supabaseAdmin.from('clients').select('manager_id').eq('id', item.client_id).maybeSingle()
  const clientManagerId = client?.manager_id ?? null
  const allowed = canAccess(user, { type: 'deliverable', agency_id: item.agency_id, client_manager_id: clientManagerId,
    assigned_editor_id: item.assigned_editor_id }, action)
  return allowed ? { item, clientManagerId } : null
}

/** Loads a cut with the facts canAccess needs. Null means missing or not permitted; callers answer 403 for both. */
export async function versionContext(user: User, versionId: string, action: Action): Promise<VersionContext | null> {
  const { data: version } = await supabaseAdmin.from('deliverable_versions')
    .select('id,agency_id,content_item_id,version,b2_key,status').eq('id', versionId).maybeSingle()
  if (!version) return null
  const found = await itemContext(user, version.content_item_id, action)
  return found ? { version, item: found.item, clientManagerId: found.clientManagerId } : null
}

/** Only admins and brand managers write review actions; an assigned editor reads and resolves. */
export const isReviewer = (user: User) => user.role === 'admin' || user.role === 'brand_manager'

export type ReviewComment = {
  id: string; version_id: string; author_id: string | null; author_label: string
  timestamp_start: number | null; timestamp_end: number | null; body: string
  has_voice: boolean; transcript: string | null; transcript_status: 'pending' | 'done' | 'failed' | null
  source: 'internal' | 'client'; resolved_at: string | null; created_at: string; edited_at: string | null
}
export const COMMENT_COLUMNS = 'id,version_id,author_id,author_label,timestamp_start,timestamp_end,body,voice_note_key,transcript,transcript_status,source,resolved_at,created_at,edited_at'

type CommentRow = Omit<ReviewComment, 'has_voice'> & { voice_note_key: string | null }
/** The voice-note key never leaves the server; clients get has_voice and fetch a presigned URL. */
export function toReviewComment(row: CommentRow): ReviewComment {
  const { voice_note_key, ...rest } = row
  return { ...rest, has_voice: !!voice_note_key,
    timestamp_start: row.timestamp_start == null ? null : Number(row.timestamp_start),
    timestamp_end: row.timestamp_end == null ? null : Number(row.timestamp_end) }
}

/** Maps the SQL functions' raised messages to HTTP statuses. */
export function rpcStatus(message: string) {
  return message === 'Forbidden' ? 403 : /not found/i.test(message) ? 404 : 409
}
