import 'server-only'
import { S3Client } from '@aws-sdk/client-s3'
import { google, type drive_v3 } from 'googleapis'
import { decrypt } from '@/lib/crypto'
import { env } from '@/lib/env'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { driveAuth, drive as legacyDrive } from '@/lib/drive/auth'

/**
 * Per-agency Drive and B2 clients. Each agency's credentials live encrypted in agency_integrations and are decrypted
 * only here, on the server. The environment credentials remain as the fallback for the original Ashmeet workspace
 * (the agency whose drive_sync_state points at GOOGLE_SHARED_DRIVE_ID) and for no one else, so a new agency can
 * never reach another agency's drive or bucket through a missing configuration.
 */

type IntegrationRow = {
  agency_id: string; drive_service_account_email: string | null; drive_service_account_key_enc: string | null; shared_drive_id: string | null
  b2_bucket: string | null; b2_prefix: string | null; b2_key_id_enc: string | null; b2_application_key_enc: string | null
  b2_endpoint: string | null; b2_region: string | null; updated_at: string
}

const TTL = 60_000
const rows = new Map<string, { at: number; row: IntegrationRow | null }>()
const driveContexts = new Map<string, { stamp: string; value: DriveContext }>()
const b2Contexts = new Map<string, { stamp: string; value: B2Context }>()

/** Call after any credential change so the next request uses the new values at once. */
export function clearIntegrationCache(agencyId?: string) {
  if (agencyId) { rows.delete(agencyId); driveContexts.delete(agencyId); b2Contexts.delete(agencyId) }
  else { rows.clear(); driveContexts.clear(); b2Contexts.clear() }
}

async function integration(agencyId: string): Promise<IntegrationRow | null> {
  const hit = rows.get(agencyId)
  if (hit && Date.now() - hit.at < TTL) return hit.row
  const { data } = await supabaseAdmin.from('agency_integrations').select('*').eq('agency_id', agencyId).maybeSingle()
  const row = (data as IntegrationRow | null) ?? null
  rows.set(agencyId, { at: Date.now(), row })
  return row
}

// ── Google Drive ──────────────────────────────────────────────────────────
export type DriveContext = { agencyId: string; drive: drive_v3.Drive; driveId: string; token: () => Promise<string>; source: 'agency' | 'environment' }

export async function driveFor(agencyId: string): Promise<DriveContext | null> {
  const row = await integration(agencyId)
  if (row?.drive_service_account_email && row.drive_service_account_key_enc && row.shared_drive_id) {
    const stamp = row.updated_at
    const cached = driveContexts.get(agencyId)
    if (cached?.stamp === stamp) return cached.value
    const auth = new google.auth.JWT({ email: row.drive_service_account_email, key: decrypt(row.drive_service_account_key_enc), scopes: ['https://www.googleapis.com/auth/drive'] })
    const value: DriveContext = { agencyId, drive: google.drive({ version: 'v3', auth }), driveId: row.shared_drive_id, source: 'agency',
      token: async () => { const { token } = await auth.getAccessToken(); if (!token) throw new Error('Failed to get a Drive access token'); return token } }
    driveContexts.set(agencyId, { stamp, value })
    return value
  }
  // Legacy: the workspace that was built on the environment credentials.
  const { data: state } = await supabaseAdmin.from('drive_sync_state').select('shared_drive_id').eq('agency_id', agencyId).maybeSingle()
  if (state?.shared_drive_id === env.GOOGLE_SHARED_DRIVE_ID && !row?.drive_service_account_key_enc) {
    return { agencyId, drive: legacyDrive, driveId: env.GOOGLE_SHARED_DRIVE_ID, source: 'environment',
      token: async () => { const { token } = await driveAuth.getAccessToken(); if (!token) throw new Error('Failed to get a Drive access token'); return token } }
  }
  return null
}

// ── Backblaze B2 ──────────────────────────────────────────────────────────
export type B2Context = { client: S3Client; bucket: string; prefix: string; endpoint: string; source: 'agency' | 'environment' }

const defaultB2: B2Context = {
  client: new S3Client({ endpoint: env.B2_ENDPOINT, region: env.B2_REGION, forcePathStyle: true,
    credentials: { accessKeyId: env.B2_KEY_ID, secretAccessKey: env.B2_APPLICATION_KEY } }),
  bucket: env.B2_BUCKET, prefix: '', endpoint: env.B2_ENDPOINT, source: 'environment',
}
export const environmentB2 = defaultB2

/** An agency's own bucket and key when configured. The environment bucket is the fallback for the original Ashmeet workspace only. */
export async function b2For(agencyId: string): Promise<B2Context> {
  const row = await integration(agencyId)
  if (!row?.b2_bucket || !row.b2_key_id_enc || !row.b2_application_key_enc) {
    // Environment bucket only for the original Ashmeet workspace (same rule as Drive); every other agency must configure its own.
    const { data: state } = await supabaseAdmin.from('drive_sync_state').select('shared_drive_id').eq('agency_id', agencyId).maybeSingle()
    if (state?.shared_drive_id === env.GOOGLE_SHARED_DRIVE_ID) return defaultB2
    throw new Error('Backblaze B2 is not configured for this agency')
  }
  const cached = b2Contexts.get(agencyId)
  if (cached?.stamp === row.updated_at) return cached.value
  const endpoint = row.b2_endpoint || env.B2_ENDPOINT
  const value: B2Context = {
    client: new S3Client({ endpoint, region: row.b2_region || env.B2_REGION, forcePathStyle: true,
      credentials: { accessKeyId: decrypt(row.b2_key_id_enc), secretAccessKey: decrypt(row.b2_application_key_enc) } }),
    bucket: row.b2_bucket, prefix: row.b2_prefix || '', endpoint, source: 'agency',
  }
  b2Contexts.set(agencyId, { stamp: row.updated_at, value })
  return value
}
