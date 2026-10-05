import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'

Object.assign(process.env, {
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'a'.repeat(30), SUPABASE_SERVICE_ROLE_KEY: 's'.repeat(30),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: 'sa@example.iam.gserviceaccount.com',
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: `-----BEGIN PRIVATE KEY-----\n${'x'.repeat(60)}\n-----END PRIVATE KEY-----`,
  GOOGLE_SHARED_DRIVE_ID: 'drive-12345', B2_ENDPOINT: 'https://s3.example.com', B2_REGION: 'eu-central-003', B2_BUCKET: 'bucket',
  B2_KEY_ID: 'key', B2_APPLICATION_KEY: 'k'.repeat(20), NEXT_PUBLIC_VAPID_PUBLIC_KEY: 'v'.repeat(20), VAPID_PRIVATE_KEY: 'p'.repeat(30),
  VAPID_SUBJECT: 'mailto:test@example.com', CREDENTIAL_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
  CRON_SECRET: 'c'.repeat(30), NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
})

test('a token is 32 random bytes and only its SHA-256 identifies it', async () => {
  const { newToken, hashToken, TOKEN_PATTERN } = await import('../src/lib/phase6/tokens')
  const token = newToken()
  assert.equal(Buffer.from(token, 'base64url').length, 32)
  assert.ok(TOKEN_PATTERN.test(token))
  assert.notEqual(newToken(), token)
  assert.equal(hashToken(token).length, 64)
  assert.ok(!hashToken(token).includes(token))
  assert.equal(hashToken(token), hashToken(token))
})

test('a PIN is four digits and stored only as a salted slow hash', async () => {
  const { newPin, hashPin, verifyPin } = await import('../src/lib/phase6/tokens')
  const pin = newPin()
  assert.match(pin, /^\d{4}$/)
  const stored = await hashPin('4821')
  assert.ok(!stored.includes('4821'))
  assert.notEqual(await hashPin('4821'), stored, 'a fresh salt per link')
  assert.equal(await verifyPin('4821', stored), true)
  assert.equal(await verifyPin('4822', stored), false)
  assert.equal(await verifyPin('4821', 'hash-active-pin'), false, 'a malformed stored hash never verifies')
})

test('the approval session cookie is bound to one link, signed and expiring', async () => {
  const { issueSession, sessionValid } = await import('../src/lib/phase6/tokens')
  const cookie = issueSession('link-1')
  assert.equal(sessionValid('link-1', cookie), true)
  assert.equal(sessionValid('link-2', cookie), false, 'another link does not accept it')
  assert.equal(sessionValid('link-1', undefined), false)
  const [id, expires, signature] = cookie.split('.')
  assert.equal(sessionValid('link-1', `${id}.${Number(expires) + 9999}.${signature}`), false, 'tampered expiry')
  assert.equal(sessionValid('link-1', `${id}.${Math.floor(Date.now() / 1000) - 5}.${signature}`), false)
})
