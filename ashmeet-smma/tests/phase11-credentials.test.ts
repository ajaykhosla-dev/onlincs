import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync } from 'node:crypto'
import { cleanToken, fingerprint, lastFour, normalizePrivateKey, parseServiceAccountInput } from '../src/lib/platform/credential-input'

const pem = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } }).privateKey
const canonical = pem.trim() + '\n'

test('a key pasted with real newlines is accepted unchanged', () => assert.equal(normalizePrivateKey(pem), canonical))

test('a key pasted with escaped \\n sequences (as in a .env file or JSON) is accepted and restored', () => {
  assert.equal(normalizePrivateKey(pem.trim().replaceAll('\n', '\\n')), canonical)
  assert.equal(normalizePrivateKey(`"${pem.trim().replaceAll('\n', '\\n')}"`), canonical, 'with surrounding quotes')
  assert.equal(normalizePrivateKey(`'${pem.trim().replaceAll('\n', '\\n')}'`), canonical)
})

test('CRLF, extra spaces and lost line breaks are tolerated', () => {
  assert.equal(normalizePrivateKey(pem.replaceAll('\n', '\r\n')), canonical)
  const oneLine = pem.trim().split('\n').join(' ')
  assert.equal(normalizePrivateKey(oneLine), canonical)
  assert.equal(normalizePrivateKey('  \n' + pem + '\n\n  '), canonical)
})

test('the normalised key is one a real RSA consumer can use', async () => {
  const { createPrivateKey } = await import('node:crypto')
  assert.doesNotThrow(() => createPrivateKey(normalizePrivateKey(pem.trim().replaceAll('\n', '\\n'))))
})

test('the downloaded JSON key file fills in the email and the key together', () => {
  const file = JSON.stringify({ type: 'service_account', client_email: 'drive@proj.iam.gserviceaccount.com', private_key: pem })
  const parsed = parseServiceAccountInput(file)
  assert.equal(parsed.email, 'drive@proj.iam.gserviceaccount.com'); assert.equal(parsed.privateKey, canonical)
  assert.equal(parseServiceAccountInput(pem).email, null)
})

test('a wrong or damaged value fails with a clear message', () => {
  assert.throws(() => normalizePrivateKey('hello'), /does not look like a private key/)
  assert.throws(() => normalizePrivateKey('-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----'), /incomplete/)
  assert.throws(() => parseServiceAccountInput('{ not json'), /could not be read/)
  assert.throws(() => parseServiceAccountInput('{"client_email":"a@b"}'), /no private_key/)
})

test('fingerprints and last-four never reveal the value', () => {
  assert.match(fingerprint(pem), /^sha256:[0-9a-f]{12}$/)
  assert.ok(!fingerprint('secret-value').includes('secret'))
  assert.equal(lastFour('  K003abcd1234  '), '1234'); assert.equal(cleanToken(' "abc" '), 'abc')
})
