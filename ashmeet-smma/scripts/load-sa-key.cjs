// One-off helper: copies a service-account JSON key into .env.local without printing it.
// Usage: node scripts/load-sa-key.cjs <path-to-key.json> <shared-drive-id>
const fs = require('fs')
const [, , keyPath, driveId] = process.argv
const k = JSON.parse(fs.readFileSync(keyPath, 'utf8'))
if (k.type !== 'service_account') throw new Error('not a service account key')

const set = {
  GOOGLE_SERVICE_ACCOUNT_EMAIL: k.client_email,
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: '"' + k.private_key.replace(/\n/g, '\\n') + '"',
  GOOGLE_SHARED_DRIVE_ID: driveId,
}
const names = Object.keys(set)
// keep only comment lines and well-formed NAME=value lines that we are not replacing
const keep = fs
  .readFileSync('.env.local', 'utf8')
  .split(/\r?\n/)
  .filter((l) => l.startsWith('#') || (/^[A-Z][A-Z0-9_]*=/.test(l) && !names.some((n) => l.startsWith(n + '='))))
for (const n of names) keep.push(n + '=' + set[n])
fs.writeFileSync('.env.local', keep.join('\n') + '\n')
console.log('loaded', names.join(', '), '| project:', k.project_id)
