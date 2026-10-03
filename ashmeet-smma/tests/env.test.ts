import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync, randomBytes } from 'node:crypto'
import { spawnSync } from 'node:child_process'

const pem = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
}).privateKey

const GOOD: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'a'.repeat(30),
  SUPABASE_SERVICE_ROLE_KEY: 'b'.repeat(30),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: 'sa@p.iam.gserviceaccount.com',
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: pem.replace(/\n/g, '\\n'),
  GOOGLE_SHARED_DRIVE_ID: 'drive12345',
  B2_ENDPOINT: 'https://s3.us-west-004.backblazeb2.com',
  B2_REGION: 'us-west-004',
  B2_BUCKET: 'b',
  B2_KEY_ID: 'k',
  B2_APPLICATION_KEY: 'z'.repeat(12),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: 'v'.repeat(12),
  VAPID_PRIVATE_KEY: 'w'.repeat(24),
  VAPID_SUBJECT: 'mailto:a@b.com',
  CREDENTIAL_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
  CRON_SECRET: randomBytes(32).toString('hex'),
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
}

type Outcome = { ok: boolean; nl?: boolean; name?: string; msg?: string }

// Each case runs in a fresh process so module caching and loader interop cannot mask a result.
function load(overrides: Record<string, string | undefined>): Outcome {
  const env: Record<string, string | undefined> = { ...process.env, ...GOOD, ...overrides }
  delete env.NODE_TEST_CONTEXT // otherwise the child behaves as a nested test-runner process
  for (const k of Object.keys(overrides)) if (overrides[k] === undefined) delete env[k]
  const r = spawnSync(process.execPath, ['--conditions=react-server', '--import', 'tsx', 'tests/helpers/load-env.ts'], {
    env: env as NodeJS.ProcessEnv,
    encoding: 'utf8',
  })
  const lines = r.stdout.trim().split(/\r?\n/)
  return JSON.parse(lines[lines.length - 1] || '{}') as Outcome
}

test('a complete environment loads, and the private key has real newlines', () => {
  const r = load({})
  assert.equal(r.ok, true, JSON.stringify(r))
  assert.equal(r.nl, true, JSON.stringify(r))
})

test('removing any required variable fails startup naming it', () => {
  for (const name of Object.keys(GOOD)) {
    const r = load({ [name]: undefined })
    assert.equal(r.ok, false, name)
    assert.equal(r.name, 'EnvError')
    assert.ok(r.msg?.includes(name), `${name} not named in: ${r.msg}`)
  }
})
