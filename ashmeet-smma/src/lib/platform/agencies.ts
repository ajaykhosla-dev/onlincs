import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'

export type AgencyRow = {
  id: string; name: string; display_name: string | null; slug: string; plan: string; status: string; logo_url: string | null
  phone: string | null; address: string | null; services: string | null; notes: string | null; created_at: string
  suspended_at: string | null; suspended_reason: string | null
}
export type Usage = { clients: number; users: number; storage_bytes: number; items_this_month: number; content_items: number }

const monthStart = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).slice(0, 7) + '-01'
const nextMonth = () => { const [y, m] = monthStart().split('-').map(Number); return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10) }

async function count(table: string, agencyId: string, filter?: (query: ReturnType<typeof supabaseAdmin.from>) => unknown) {
  let query = supabaseAdmin.from(table).select('id', { count: 'exact', head: true }).eq('agency_id', agencyId)
  if (filter) query = filter(query as never) as typeof query
  const { count: n, error } = await query
  if (error) throw new Error(error.message)
  return n ?? 0
}

/** Clients, users, raw storage and this month's content for one agency, each from its own query. */
export async function agencyUsage(agencyId: string): Promise<Usage> {
  const [clients, users, items, month, raw] = await Promise.all([
    count('clients', agencyId),
    count('users', agencyId, (q) => (q as unknown as { eq: (a: string, b: boolean) => unknown }).eq('is_active', true)),
    count('content_items', agencyId),
    count('content_items', agencyId, (q) => (q as unknown as { gte: (a: string, b: string) => { lt: (a: string, b: string) => unknown } }).gte('planned_date', monthStart()).lt('planned_date', nextMonth())),
    supabaseAdmin.from('raw_files').select('size_bytes').eq('agency_id', agencyId),
  ])
  if (raw.error) throw new Error(raw.error.message)
  return { clients, users, content_items: items, items_this_month: month, storage_bytes: (raw.data ?? []).reduce((total, row) => total + Number(row.size_bytes), 0) }
}

export async function listAgencies(): Promise<(AgencyRow & { usage: Usage })[]> {
  const { data, error } = await supabaseAdmin.from('agencies').select('*').order('created_at')
  if (error) throw new Error(error.message)
  return Promise.all((data as AgencyRow[]).map(async (agency) => ({ ...agency, usage: await agencyUsage(agency.id) })))
}

export async function getAgency(id: string): Promise<AgencyRow | null> {
  const { data } = await supabaseAdmin.from('agencies').select('*').eq('id', id).maybeSingle()
  return (data as AgencyRow | null) ?? null
}

/** Columns that must never leave the platform: hashes, encrypted session URIs and anything credential-like. */
const OMIT: Record<string, string[]> = {
  users: ['auth_user_id'], approval_links: ['token_hash', 'pin_hash'], upload_sessions: ['session_uri_enc'], push_subscriptions: ['endpoint', 'p256dh', 'auth'],
}

async function all(table: string, agencyId: string): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabaseAdmin.from(table).select('*').eq('agency_id', agencyId).range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    rows.push(...(data ?? []))
    if ((data ?? []).length < 1000) break
  }
  const omit = OMIT[table] ?? []
  return omit.length ? rows.map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => !omit.includes(key)))) : rows
}

/** Everything an agency owns as JSON, plus a manifest of its media in Drive and B2, so leaving is possible. Never includes credentials. */
export async function exportAgency(agencyId: string) {
  const agency = await getAgency(agencyId)
  if (!agency) throw new Error('Agency not found')
  const tables = ['users', 'clients', 'client_scope', 'content_items', 'monthly_plans', 'shoots', 'raw_files', 'upload_sessions', 'deliverable_versions',
    'comments', 'approval_links', 'post_schedule', 'library_assets', 'activity_log', 'notifications']
  const data: Record<string, Record<string, unknown>[]> = {}
  for (const table of tables) data[table] = await all(table, agencyId)
  const shootIds = (data.shoots ?? []).map((shoot) => shoot.id as string)
  const shootItems: Record<string, unknown>[] = []
  for (let i = 0; i < shootIds.length; i += 200) {
    const { data: rows, error } = await supabaseAdmin.from('shoot_items').select('*').in('shoot_id', shootIds.slice(i, i + 200))
    if (error) throw new Error(`shoot_items: ${error.message}`)
    shootItems.push(...(rows ?? []))
  }
  data.shoot_items = shootItems
  const media = {
    drive_raw_files: (data.raw_files ?? []).map((file) => ({ file_name: file.file_name, size_bytes: file.size_bytes, drive_file_id: file.drive_file_id, drive_link: file.drive_link, shoot_id: file.shoot_id })),
    b2_cuts: (data.deliverable_versions ?? []).map((version) => ({ key: version.b2_key, size_bytes: version.file_size_bytes, content_item_id: version.content_item_id, version: version.version })),
    b2_library: (data.library_assets ?? []).map((asset) => ({ key: asset.b2_key, name: asset.name, size_bytes: asset.file_size_bytes, client_id: asset.client_id })),
    b2_voice_notes: (data.comments ?? []).filter((comment) => comment.voice_note_key).map((comment) => ({ key: comment.voice_note_key, comment_id: comment.id })),
  }
  return {
    exported_at: new Date().toISOString(), format: 'rapidarc-agency-export-v1',
    agency: { ...agency }, counts: Object.fromEntries(Object.entries(data).map(([table, rows]) => [table, rows.length])),
    data, media_manifest: media,
    notes: 'Credentials, link hashes, session URIs and push subscriptions are never included.',
  }
}
