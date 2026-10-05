import 'server-only'
import { accessibleClients } from '@/lib/phase3/data'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { DRIVE_POOL_BYTES, ELIGIBLE_AFTER_DAYS, levelFor } from './constants'
import type { User } from '@/types/database'

export type StorageShoot = { id: string; title: string; date: string; bytes: number; files: number; eligible: boolean; reason: string }
export type StorageClient = { client_id: string; name: string; bytes: number; shoots: StorageShoot[] }
export type StorageOverview = {
  pool: number; used: number; percent: number; level: 'ok' | 'warn70' | 'warn85'
  byClient: StorageClient[]; otherBytes: number
  b2: { cuts: number; library: number; total: number }
  eligible: { shoot_id: string; client: string; title: string; bytes: number }[]
  freeable: number
  staleSessions: { id: string; file: string; client: string; shoot: string; status: string; ageHours: number; percent: number }[]
}

function check(error: { message: string } | null) { if (error) throw new Error(error.message) }

/** Raw footage (Drive) and cuts and library (B2), broken down by client and shoot, largest first. */
export async function storageOverview(user: User): Promise<StorageOverview> {
  const clients = await accessibleClients(user)
  const visible = new Map(clients.map((client) => [client.id, client.name]))
  const allClients = await supabaseAdmin.from('clients').select('id,name').eq('agency_id', user.agency_id)
  check(allClients.error)
  const [raw, shoots, links, versions, library, sessions] = await Promise.all([
    supabaseAdmin.from('raw_files').select('shoot_id,size_bytes').eq('agency_id', user.agency_id),
    supabaseAdmin.from('shoots').select('id,client_id,title,scheduled_start,status').eq('agency_id', user.agency_id),
    supabaseAdmin.from('shoot_items').select('shoot_id,content_item_id'),
    supabaseAdmin.from('deliverable_versions').select('file_size_bytes').eq('agency_id', user.agency_id),
    supabaseAdmin.from('library_assets').select('file_size_bytes').eq('agency_id', user.agency_id),
    supabaseAdmin.from('upload_sessions').select('id,shoot_id,file_name,file_size_bytes,bytes_received,status,created_at,last_progress_at').eq('agency_id', user.agency_id).in('status', ['active', 'expired']),
  ])
  for (const result of [raw, shoots, links, versions, library, sessions]) check(result.error)
  const shootIds = new Set((shoots.data ?? []).map((shoot) => shoot.id))
  const itemIds = [...new Set((links.data ?? []).filter((link) => shootIds.has(link.shoot_id)).map((link) => link.content_item_id))]
  const [items, posts] = itemIds.length ? await Promise.all([
    supabaseAdmin.from('content_items').select('id,status').in('id', itemIds),
    supabaseAdmin.from('post_schedule').select('content_item_id,posted_at').in('content_item_id', itemIds),
  ]) : [{ data: [], error: null }, { data: [], error: null }]
  check(items.error); check(posts.error)
  const itemStatus = new Map((items.data ?? []).map((item) => [item.id, item.status]))
  const postedAt = new Map((posts.data ?? []).filter((post) => post.posted_at).map((post) => [post.content_item_id, post.posted_at as string]))
  const cutoff = Date.now() - ELIGIBLE_AFTER_DAYS * 864e5

  const bytesByShoot = new Map<string, { bytes: number; files: number }>()
  for (const file of raw.data ?? []) {
    const entry = bytesByShoot.get(file.shoot_id) ?? { bytes: 0, files: 0 }
    entry.bytes += Number(file.size_bytes); entry.files++
    bytesByShoot.set(file.shoot_id, entry)
  }
  const used = [...bytesByShoot.values()].reduce((total, entry) => total + entry.bytes, 0)

  /** Eligible only when every idea on the shoot was posted more than 30 days ago. */
  const eligibility = (shootId: string) => {
    const mine = (links.data ?? []).filter((link) => link.shoot_id === shootId).map((link) => link.content_item_id)
    if (!mine.length) return { eligible: false, reason: 'No ideas linked' }
    const notPosted = mine.filter((id) => itemStatus.get(id) !== 'posted')
    if (notPosted.length) return { eligible: false, reason: `${notPosted.length} of ${mine.length} ideas not posted yet` }
    const recent = mine.filter((id) => !postedAt.get(id) || Date.parse(postedAt.get(id)!) > cutoff)
    if (recent.length) return { eligible: false, reason: `Posted within the last ${ELIGIBLE_AFTER_DAYS} days` }
    return { eligible: true, reason: `All ideas posted over ${ELIGIBLE_AFTER_DAYS} days ago` }
  }

  const byClientMap = new Map<string, StorageClient>()
  let otherBytes = 0
  const eligible: StorageOverview['eligible'] = []
  const clientNames = new Map((allClients.data ?? []).map((client) => [client.id, client.name]))
  for (const shoot of shoots.data ?? []) {
    const usage = bytesByShoot.get(shoot.id) ?? { bytes: 0, files: 0 }
    if (!usage.bytes) continue
    if (!visible.has(shoot.client_id)) { otherBytes += usage.bytes; continue }
    const verdict = eligibility(shoot.id)
    const entry: StorageClient = byClientMap.get(shoot.client_id) ?? { client_id: shoot.client_id, name: visible.get(shoot.client_id)!, bytes: 0, shoots: [] }
    entry.bytes += usage.bytes
    entry.shoots.push({ id: shoot.id, title: shoot.title, date: String(shoot.scheduled_start).slice(0, 10), bytes: usage.bytes, files: usage.files, ...verdict })
    byClientMap.set(shoot.client_id, entry)
    if (verdict.eligible) eligible.push({ shoot_id: shoot.id, client: clientNames.get(shoot.client_id) ?? '', title: shoot.title, bytes: usage.bytes })
  }
  const byClient = [...byClientMap.values()].map((entry) => ({ ...entry, shoots: entry.shoots.sort((a, b) => b.bytes - a.bytes) })).sort((a, b) => b.bytes - a.bytes)
  const sum = (rows: { file_size_bytes: number | string }[] | null) => (rows ?? []).reduce((total, row) => total + Number(row.file_size_bytes), 0)
  const cuts = sum(versions.data), lib = sum(library.data)

  const shootById = new Map((shoots.data ?? []).map((shoot) => [shoot.id, shoot]))
  const staleSessions = (sessions.data ?? []).flatMap((session) => {
    const shoot = shootById.get(session.shoot_id)
    if (!shoot || !visible.has(shoot.client_id)) return []
    const last = Date.parse(session.last_progress_at ?? session.created_at)
    return [{ id: session.id, file: session.file_name, client: visible.get(shoot.client_id)!, shoot: shoot.title, status: session.status,
      ageHours: Math.round((Date.now() - last) / 36e5), percent: session.file_size_bytes ? Math.round((Number(session.bytes_received) / Number(session.file_size_bytes)) * 100) : 0 }]
  }).sort((a, b) => b.ageHours - a.ageHours)

  return { pool: DRIVE_POOL_BYTES, used, percent: Math.round((used / DRIVE_POOL_BYTES) * 1000) / 10, level: levelFor(used),
    byClient, otherBytes, b2: { cuts, library: lib, total: cuts + lib }, eligible,
    freeable: eligible.reduce((total, entry) => total + entry.bytes, 0), staleSessions }
}

/** Re-checks one shoot on the server so deletion never relies on what the browser says is eligible. */
export async function eligibleShoot(user: User, shootId: string) {
  const overview = await storageOverview(user)
  return overview.byClient.flatMap((client) => client.shoots.map((shoot) => ({ ...shoot, client_id: client.client_id, client: client.name }))).find((shoot) => shoot.id === shootId && shoot.eligible) ?? null
}
