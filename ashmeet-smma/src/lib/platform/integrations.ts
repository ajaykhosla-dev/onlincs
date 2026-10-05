import 'server-only'
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { z } from 'zod'
import { encrypt } from '@/lib/crypto'
import { b2For, clearIntegrationCache, driveFor } from '@/lib/integrations/credentials'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { cleanToken, fingerprint, lastFour, parseServiceAccountInput } from './credential-input'

/** What the console may show about a credential: whether it is set and a fingerprint. Never the value. */
export type IntegrationSummary = {
  drive: { email: string | null; key_set: boolean; key_fingerprint: string | null; shared_drive_id: string | null }
  b2: { bucket: string | null; prefix: string | null; endpoint: string | null; region: string | null; key_id_last4: string | null; app_key_last4: string | null; key_set: boolean }
  last_test: unknown; last_test_at: string | null
  uses_environment_fallback: boolean
}

export async function integrationSummary(agencyId: string): Promise<IntegrationSummary> {
  const { data } = await supabaseAdmin.from('agency_integrations').select('drive_service_account_email,drive_service_account_key_enc,drive_key_fingerprint,shared_drive_id,b2_bucket,b2_prefix,b2_endpoint,b2_region,b2_key_id_enc,b2_application_key_enc,b2_key_id_last4,b2_app_key_last4,last_test,last_test_at').eq('agency_id', agencyId).maybeSingle()
  const ownDrive = !!(data?.drive_service_account_key_enc && data.shared_drive_id)
  const ownB2 = !!(data?.b2_key_id_enc && data.b2_application_key_enc && data.b2_bucket)
  return {
    drive: { email: data?.drive_service_account_email ?? null, key_set: !!data?.drive_service_account_key_enc, key_fingerprint: data?.drive_key_fingerprint ?? null, shared_drive_id: data?.shared_drive_id ?? null },
    b2: { bucket: data?.b2_bucket ?? null, prefix: data?.b2_prefix ?? null, endpoint: data?.b2_endpoint ?? null, region: data?.b2_region ?? null,
      key_id_last4: data?.b2_key_id_last4 ?? null, app_key_last4: data?.b2_app_key_last4 ?? null, key_set: !!(data?.b2_key_id_enc && data?.b2_application_key_enc) },
    last_test: data?.last_test ?? null, last_test_at: data?.last_test_at ?? null,
    uses_environment_fallback: !ownDrive || !ownB2,
  }
}

/** Every field is optional: only what is sent is changed. Blank means "leave as is", so a form can be saved without re-pasting secrets. */
export const integrationPatch = z.object({
  drive_service_account_key: z.string().max(20000).optional(),
  drive_service_account_email: z.string().trim().max(200).optional(),
  shared_drive_id: z.string().trim().max(200).optional(),
  b2_bucket: z.string().trim().max(200).optional(),
  b2_prefix: z.string().trim().max(200).optional(),
  b2_endpoint: z.string().trim().max(300).optional(),
  b2_region: z.string().trim().max(100).optional(),
  b2_key_id: z.string().max(500).optional(),
  b2_application_key: z.string().max(500).optional(),
})
export type IntegrationPatch = z.infer<typeof integrationPatch>

/** Encrypts and stores what was sent. Returns the names of the fields that changed, never values. */
export async function saveIntegration(agencyId: string, patch: IntegrationPatch): Promise<{ changed: string[]; rotated: string[] }> {
  const { data: existing } = await supabaseAdmin.from('agency_integrations').select('*').eq('agency_id', agencyId).maybeSingle()
  const update: Record<string, unknown> = {}
  const changed: string[] = [], rotated: string[] = []
  const had = (column: string) => !!(existing as Record<string, unknown> | null)?.[column]

  if (patch.drive_service_account_key?.trim()) {
    const parsed = parseServiceAccountInput(patch.drive_service_account_key)
    update.drive_service_account_key_enc = encrypt(parsed.privateKey)
    update.drive_key_fingerprint = fingerprint(parsed.privateKey)
    if (parsed.email && !patch.drive_service_account_email) update.drive_service_account_email = parsed.email
    ;(had('drive_service_account_key_enc') ? rotated : changed).push('drive_service_account_key')
  }
  if (patch.drive_service_account_email?.trim()) { update.drive_service_account_email = patch.drive_service_account_email; changed.push('drive_service_account_email') }
  if (patch.shared_drive_id?.trim()) { update.shared_drive_id = patch.shared_drive_id; changed.push('shared_drive_id') }
  if (patch.b2_bucket?.trim()) { update.b2_bucket = patch.b2_bucket; changed.push('b2_bucket') }
  if (patch.b2_prefix !== undefined && patch.b2_prefix !== (existing?.b2_prefix ?? '')) { update.b2_prefix = patch.b2_prefix || null; changed.push('b2_prefix') }
  if (patch.b2_endpoint?.trim()) { update.b2_endpoint = patch.b2_endpoint.replace(/\/$/, ''); changed.push('b2_endpoint') }
  if (patch.b2_region?.trim()) { update.b2_region = patch.b2_region; changed.push('b2_region') }
  if (patch.b2_key_id?.trim()) {
    const value = cleanToken(patch.b2_key_id)
    update.b2_key_id_enc = encrypt(value); update.b2_key_id_last4 = lastFour(value)
    ;(had('b2_key_id_enc') ? rotated : changed).push('b2_key_id')
  }
  if (patch.b2_application_key?.trim()) {
    const value = cleanToken(patch.b2_application_key)
    update.b2_application_key_enc = encrypt(value); update.b2_app_key_last4 = lastFour(value)
    ;(had('b2_application_key_enc') ? rotated : changed).push('b2_application_key')
  }
  if (!Object.keys(update).length) return { changed: [], rotated: [] }
  update.updated_at = new Date().toISOString()
  update.last_test = null; update.last_test_at = null
  const { error } = await supabaseAdmin.from('agency_integrations').upsert({ agency_id: agencyId, ...update }, { onConflict: 'agency_id' })
  if (error) throw new Error('Could not save the credentials')

  // The hourly Drive sync works from this row, so a configured agency needs one.
  const merged = { ...(existing ?? {}), ...update } as { shared_drive_id?: string | null }
  if (merged.shared_drive_id) {
    await supabaseAdmin.from('drive_sync_state').upsert({ agency_id: agencyId, shared_drive_id: merged.shared_drive_id, page_token: null }, { onConflict: 'agency_id' })
  }
  clearIntegrationCache(agencyId)
  return { changed, rotated }
}

// ── Test connection ───────────────────────────────────────────────────────
export type TestStep = { service: 'Google Drive' | 'Backblaze B2'; name: string; status: 'pass' | 'fail' | 'warn' | 'skipped'; detail: string }

const reason = (error: unknown) => {
  const e = error as { message?: string; code?: number | string; status?: number; name?: string; $metadata?: { httpStatusCode?: number } }
  const status = e?.status ?? (typeof e?.code === 'number' ? e.code : undefined) ?? e?.$metadata?.httpStatusCode
  return `${e?.message ?? e?.name ?? 'Unknown error'}${status ? ` (HTTP ${status})` : ''}`.slice(0, 240)
}

/** The same checks as the Phase 0 scripts, run with this agency's own credentials, reported one step at a time. */
export async function testConnection(agencyId: string): Promise<TestStep[]> {
  const steps: TestStep[] = []
  const add = (service: TestStep['service'], name: string, status: TestStep['status'], detail: string) => steps.push({ service, name, status, detail })

  // Google Drive
  const drive = await driveFor(agencyId).catch(() => null)
  if (!drive) add('Google Drive', 'Credentials are configured', 'fail', 'No service account, key and Shared Drive ID are saved for this agency.')
  else {
    add('Google Drive', 'Credentials are configured', 'pass', drive.source === 'agency' ? 'Using this agency\'s own service account.' : 'Using the platform environment credentials (not yet moved to this agency).')
    let ok = true
    try { await drive.token(); add('Google Drive', 'Sign in as the service account', 'pass', 'A Drive access token was issued.') }
    catch (error) { ok = false; add('Google Drive', 'Sign in as the service account', 'fail', `The key was rejected: ${reason(error)}`) }
    if (ok) {
      try { const shared = await drive.drive.drives.get({ driveId: drive.driveId, fields: 'id,name' }); add('Google Drive', 'Reach the Shared Drive', 'pass', `Found "${shared.data.name}".`) }
      catch (error) { ok = false; add('Google Drive', 'Reach the Shared Drive', 'fail', `The service account cannot open this Shared Drive (is it a member?): ${reason(error)}`) }
    }
    if (ok) {
      try {
        const folder = await drive.drive.files.create({ requestBody: { name: `rapidarc-connection-test-${Date.now()}`, mimeType: 'application/vnd.google-apps.folder', parents: [drive.driveId] }, fields: 'id', supportsAllDrives: true })
        const id = folder.data.id!
        await drive.drive.files.delete({ fileId: id, supportsAllDrives: true }).catch(() => drive.drive.files.update({ fileId: id, supportsAllDrives: true, requestBody: { trashed: true } }))
        add('Google Drive', 'Create a folder', 'pass', 'Created a test folder and removed it.')
      } catch (error) { add('Google Drive', 'Create a folder', 'fail', `The service account cannot create folders (needs Content manager): ${reason(error)}`) }
    } else add('Google Drive', 'Create a folder', 'skipped', 'Skipped because an earlier step failed.')
  }

  // Backblaze B2
  const b2 = await b2For(agencyId).catch(() => null)
  if (!b2) add('Backblaze B2', 'Credentials are configured', 'fail', 'No bucket and key are saved for this agency.')
  else {
    add('Backblaze B2', 'Credentials are configured', 'pass', b2.source === 'agency' ? `Using bucket "${b2.bucket}" with this agency's own key.` : 'Using the platform environment bucket (not yet moved to this agency).')
    const key = `${agencyId}/__verify/test-${Date.now()}.bin`
    const payload = Buffer.alloc(1024, 7)
    let uploaded = false
    try {
      const url = await getSignedUrl(b2.client, new PutObjectCommand({ Bucket: b2.bucket, Key: key, ContentType: 'application/octet-stream' }), { expiresIn: 120 })
      const response = await fetch(url, { method: 'PUT', body: payload, headers: { 'Content-Type': 'application/octet-stream' } })
      if (!response.ok) throw Object.assign(new Error(`upload refused`), { status: response.status })
      uploaded = true; add('Backblaze B2', 'Upload with a presigned URL', 'pass', 'Uploaded a 1 KB test object.')
    } catch (error) { add('Backblaze B2', 'Upload with a presigned URL', 'fail', `The key cannot write to this bucket: ${reason(error)}`) }
    if (uploaded) {
      try {
        const url = await getSignedUrl(b2.client, new GetObjectCommand({ Bucket: b2.bucket, Key: key }), { expiresIn: 120 })
        const ranged = await fetch(url, { headers: { Range: 'bytes=0-99' } })
        const bytes = (await ranged.arrayBuffer()).byteLength
        if (ranged.status !== 206 || bytes !== 100) throw new Error(`expected 206 with 100 bytes, got ${ranged.status} with ${bytes}`)
        add('Backblaze B2', 'Ranged read (seeking)', 'pass', 'A 100-byte range came back as HTTP 206.')
      } catch (error) { add('Backblaze B2', 'Ranged read (seeking)', 'fail', `Range requests do not work: ${reason(error)}`) }
      try {
        const open = await fetch(`${b2.endpoint}/${b2.bucket}/${key}`)
        if (open.ok) throw new Error('the object is readable without a signature')
        add('Backblaze B2', 'Bucket is private', 'pass', `An unsigned request was refused (HTTP ${open.status}).`)
      } catch (error) { add('Backblaze B2', 'Bucket is private', 'fail', `${reason(error)}. Make the bucket private.`) }
      try { await b2.client.send(new DeleteObjectCommand({ Bucket: b2.bucket, Key: key })); add('Backblaze B2', 'Clean up', 'pass', 'Removed the test object.') }
      catch (error) { add('Backblaze B2', 'Clean up', 'warn', `Could not remove the test object ${key}: ${reason(error)}`) }
    } else { add('Backblaze B2', 'Ranged read (seeking)', 'skipped', 'Skipped because the upload failed.'); add('Backblaze B2', 'Bucket is private', 'skipped', 'Skipped because the upload failed.') }
    // A key limited to this agency's prefix cannot even look at another agency's objects (AccessDenied, not NotFound).
    try {
      await b2.client.send(new HeadObjectCommand({ Bucket: b2.bucket, Key: `ag-0000000000/__verify/other-agency-probe` }))
      add('Backblaze B2', 'Key is limited to this agency', 'warn', 'The key can read outside this agency\'s prefix. Create the application key with a name prefix of this agency\'s id.')
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
      if (status === 403 || status === 401) add('Backblaze B2', 'Key is limited to this agency', 'pass', 'The key is refused outside this agency\'s prefix.')
      else add('Backblaze B2', 'Key is limited to this agency', 'warn', `The key is not restricted to this agency's prefix (a lookup outside it returned HTTP ${status ?? 'unknown'}). Restrict the key to the prefix "${agencyId}/" in Backblaze.`)
    }
  }
  await supabaseAdmin.from('agency_integrations').update({ last_test: steps, last_test_at: new Date().toISOString() }).eq('agency_id', agencyId)
  return steps
}
