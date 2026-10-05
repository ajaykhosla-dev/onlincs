/**
 * Application-level multi-tenant checks against the live database, using a temporary agency that is always removed.
 * Credentials: encrypted at rest, never returned, rotation takes effect. Routing: Drive and B2 clients are chosen by agency.
 * Isolation: analytics, magic links and access checks stay inside one agency. Run: npm run verify:tenants
 */
import assert from 'node:assert/strict'
import { createHash, generateKeyPairSync, randomBytes } from 'node:crypto'
import { env } from '../src/lib/env'
import { decrypt } from '../src/lib/crypto'
import { b2For, clearIntegrationCache, driveFor } from '../src/lib/integrations/credentials'
import { presignGet } from '../src/lib/b2/presign'
import { integrationSummary, saveIntegration } from '../src/lib/platform/integrations'
import { loadInputs } from '../src/lib/analytics'
import { resolveLink } from '../src/lib/phase6/client-link'
import { itemContext } from '../src/lib/phase6/review'
import { supabaseAdmin } from '../src/lib/supabase/admin'
import type { User } from '../src/types/database'

const T = `ag-qa-${randomBytes(4).toString('hex')}`
let checks = 0
const ok = (condition: unknown, label: string) => { assert.ok(condition, label); checks++ }

async function main() {
  await supabaseAdmin.from('agencies').insert({ id: T, name: 'QA Temp Agency', slug: T, status: 'trial' })
  await supabaseAdmin.from('agency_integrations').insert({ agency_id: T })
  try {
    // 1. An unconfigured agency never falls back to another agency's Drive; the original workspace still works.
    ok((await driveFor(T)) === null, 'a new agency has no Drive access until credentials are saved')
    ok((await driveFor('ag-1'))?.source === 'environment', 'the original Ashmeet workspace keeps working on the environment credentials')
    ok((await driveFor('ag-2')) === null, 'Northside has no Drive configured and cannot borrow another agency\'s')

    // 2. Saving credentials encrypts them, never echoes them back, and accepts a key pasted with escaped newlines.
    const pem = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } }).privateKey
    const escaped = pem.trim().replaceAll('\n', '\\n')
    const saved = await saveIntegration(T, { drive_service_account_key: `"${escaped}"`, drive_service_account_email: 'qa@qa.iam.gserviceaccount.com', shared_drive_id: '0AQAtempdrive',
      b2_bucket: 'qa-bucket', b2_endpoint: 'https://s3.qa.example.com', b2_region: 'qa-1', b2_key_id: ' "KEYID1111" ', b2_application_key: 'SECRETAPPKEY2222' })
    ok(saved.changed.includes('drive_service_account_key') && saved.changed.includes('b2_application_key'), 'the save reports which fields changed')
    const { data: row } = await supabaseAdmin.from('agency_integrations').select('*').eq('agency_id', T).single()
    const stored = JSON.stringify(row)
    for (const secret of ['KEYID1111', 'SECRETAPPKEY2222', 'BEGIN PRIVATE KEY', pem.split('\n')[1]]) ok(!stored.includes(secret), `the stored row does not contain "${secret.slice(0, 12)}…"`)
    ok(decrypt(row!.b2_application_key_enc) === 'SECRETAPPKEY2222' && decrypt(row!.b2_key_id_enc) === 'KEYID1111', 'the values decrypt back with the application key')
    ok(decrypt(row!.drive_service_account_key_enc) === pem.trim() + '\n', 'a key pasted with escaped newlines was restored correctly')
    const summary = JSON.stringify(await integrationSummary(T))
    for (const secret of ['KEYID1111', 'SECRETAPPKEY2222', 'PRIVATE KEY']) ok(!summary.includes(secret), `the console summary never returns "${secret}"`)
    ok(summary.includes('1111') && summary.includes('2222') && summary.includes('sha256:'), 'it shows last-four and a fingerprint instead')
    const { data: state } = await supabaseAdmin.from('drive_sync_state').select('shared_drive_id').eq('agency_id', T).maybeSingle()
    ok(state?.shared_drive_id === '0AQAtempdrive', 'a Drive sync state was registered for the new agency')

    // 3. Clients are resolved per agency, from the key's own prefix: A's credentials never sign B's objects.
    clearIntegrationCache()
    const own = await b2For(T)
    ok(own.source === 'agency' && own.bucket === 'qa-bucket' && own.endpoint === 'https://s3.qa.example.com', 'the temp agency resolves to its own bucket and endpoint')
    const urlT = await presignGet(`${T}/cuts/ci-1/v1.mp4`, 60)
    ok(urlT.includes('s3.qa.example.com') && urlT.includes('KEYID1111') && urlT.includes('/qa-bucket/'), 'its objects are signed with its own key, bucket and endpoint')
    const urlA = await presignGet('ag-1/cuts/ci-1/v1.mp4', 60)
    ok(urlA.includes(env.B2_KEY_ID) && !urlA.includes('KEYID1111') && urlA.includes(`/${env.B2_BUCKET}/`), 'another agency\'s objects are never signed with the temp agency\'s key')
    ok(!urlT.includes(env.B2_KEY_ID), 'and the temp agency\'s objects never use the platform key')

    // 4. Rotation takes effect immediately and is reported as a rotation.
    const rotated = await saveIntegration(T, { b2_key_id: 'KEYID9999' })
    ok(rotated.rotated.includes('b2_key_id') && !rotated.changed.includes('b2_key_id'), 'replacing a stored credential is reported as a rotation')
    ok((await presignGet(`${T}/cuts/ci-1/v1.mp4`, 60)).includes('KEYID9999'), 'the new key is used straight away')
    ok((await integrationSummary(T)).b2.key_id_last4 === '9999', 'the fingerprint follows the rotation')

    // 5. Analytics see one agency only.
    const [a1, a2] = await Promise.all([loadInputs('ag-1'), loadInputs('ag-2')])
    const ids1 = new Set(a1.items.map((item) => item.id)), ids2 = new Set(a2.items.map((item) => item.id))
    ok([...ids2].every((id) => !ids1.has(id)), 'the two agencies have no content item in common')
    ok(a1.events.every((event) => ids1.has(event.entity_id)) && a2.events.every((event) => ids2.has(event.entity_id)), 'each agency\'s activity trail only references its own items')
    ok(a1.people.every((person) => !a2.people.some((other) => other.id === person.id)), 'team lists do not overlap')
    const { count: total } = await supabaseAdmin.from('activity_log').select('id', { count: 'exact', head: true }).eq('entity_type', 'content_item').not('to_state', 'is', null)
    ok(a1.events.length + a2.events.length <= (total ?? 0), 'analytics inputs for two agencies never exceed the platform total')
    const empty = await loadInputs(T)
    ok(!empty.events.length && !empty.items.length && !empty.clients.length, 'a brand-new agency\'s analytics are empty, not borrowed')

    // 6. A magic-link token resolves only to its own agency's link and item; another agency's admin cannot act on it.
    const token = randomBytes(32).toString('base64url')
    const { data: link } = await supabaseAdmin.from('approval_links').select('id,agency_id,content_item_id,token_hash').eq('agency_id', 'ag-2').limit(1).single()
    const original = link!.token_hash
    await supabaseAdmin.from('approval_links').update({ token_hash: createHash('sha256').update(token).digest('hex') }).eq('id', link!.id)
    try {
      const resolved = await resolveLink(token)
      ok(resolved.link?.agency_id === 'ag-2', 'the token resolves to its own agency\'s link')
      const { data: ashmeetAdmin } = await supabaseAdmin.from('users').select('*').eq('id', 'u-1').single()
      ok((await itemContext(ashmeetAdmin as User, link!.content_item_id, 'write')) === null, 'an Ashmeet admin cannot reach a Northside item through its link')
      ok((await resolveLink(randomBytes(32).toString('base64url'))).state === 'invalid', 'a token that does not exist resolves to not-found')
    } finally { await supabaseAdmin.from('approval_links').update({ token_hash: original }).eq('id', link!.id) }
  } finally {
    await supabaseAdmin.from('drive_sync_state').delete().eq('agency_id', T)
    await supabaseAdmin.from('agency_integrations').delete().eq('agency_id', T)
    await supabaseAdmin.from('agencies').delete().eq('id', T)
    clearIntegrationCache()
  }
  console.log(`Multi-tenant application checks passed: ${checks} assertions (temporary agency removed).`)
}
main().catch((error) => { console.error(error); process.exit(1) })
