/**
 * Greps the built client bundle (.next/static) for every secret value in the environment and for private-key markers.
 * Run after `next build`:  node --env-file=.env.local scripts/audit-client-bundle.mjs
 */
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const SECRET_NAMES = ['SUPABASE_SERVICE_ROLE_KEY', 'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY', 'B2_APPLICATION_KEY', 'B2_KEY_ID', 'VAPID_PRIVATE_KEY',
  'CREDENTIAL_ENCRYPTION_KEY', 'CRON_SECRET', 'TRANSCRIPTION_API_KEY', 'TEST_DATABASE_URL', 'SENTRY_AUTH_TOKEN']
async function walk(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...await walk(path)); else out.push(path)
  }
  return out
}
const files = (await walk('.next/static')).filter((file) => /\.(js|css|html|json|map)$/.test(file))
const needles = SECRET_NAMES.flatMap((name) => {
  const value = process.env[name]
  if (!value || value.length < 8) return []
  // The whole value, plus its last 40 characters (the unique tail). A prefix would be a false positive: the first characters of a
  // Supabase JWT are the same public header as the anon key's, which is meant to be in the browser.
  const decoded = value.replaceAll('\\n', '\n')
  const variants = [value, decoded]
  if (value.length > 60) variants.push(decoded.trimEnd().slice(-40))
  return [...new Set(variants)].map((needle) => ({ name, needle }))
})
needles.push({ name: 'private key marker', needle: 'BEGIN PRIVATE KEY' }, { name: 'session_uri_enc column value', needle: 'session_uri_enc' })
let bytes = 0; const hits = []
for (const file of files) {
  const text = await readFile(file, 'utf8'); bytes += text.length
  for (const { name, needle } of needles) if (text.includes(needle)) hits.push(`${name} in ${file}`)
}
console.log(`Scanned ${files.length} client files (${(bytes / 1048576).toFixed(1)} MB) for ${needles.length} secret patterns.`)
if (hits.length) { console.error('LEAKS FOUND:\n' + hits.join('\n')); process.exit(1) }
console.log('No secret values found in the client bundle.')
