import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { scrubBreadcrumb, scrubEvent, scrubString } from '../src/lib/sentry-scrub'

const token = randomBytes(32).toString('base64url')

test('a magic-link token never survives in a URL, message or stack frame', () => {
  assert.ok(!scrubString(`GET /approve/${token} failed`).includes(token))
  assert.ok(!scrubString(`https://app.example.com/api/approve/${token}/verify`).includes(token))
  assert.ok(!scrubString(`Error for ${token} while loading`).includes(token), 'a bare 43-character token in free text')
})

test('PINs, auth headers, cookies, bodies and credentials are removed from an error event', () => {
  const event = scrubEvent({
    message: `Failed at /approve/${token}`,
    request: { url: `https://app.example.com/approve/${token}?pin=4821`, headers: { authorization: 'Bearer abc.def', cookie: 'approval_session=x' }, cookies: { a: 'b' }, data: { pin: '4821' }, query_string: 'pin=4821' },
    user: { id: 'u-2', email: 'jaspreet@ashmeetsmma.com', ip_address: '1.2.3.4' },
    extra: { pin: '4821', body: { token, password: 'hunter2', nested: { privateKey: '-----BEGIN PRIVATE KEY-----\nMIIE\n-----END PRIVATE KEY-----', GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: 'x' } }, note: 'Bearer eyJhbGciOi.payload.sig' },
    exception: { values: [{ value: `Upload to https://b2/x?X-Amz-Signature=deadbeef&X-Amz-Credential=KEY failed` }] },
  })
  const text = JSON.stringify(event)
  for (const secret of [token, '4821', 'hunter2', 'Bearer abc.def', 'approval_session', 'deadbeef', 'MIIE', 'jaspreet@ashmeetsmma.com', '1.2.3.4', 'eyJhbGciOi'])
    assert.ok(!text.includes(secret), `leaked: ${secret}`)
  assert.equal(event.request?.headers, undefined); assert.equal(event.request?.data, undefined)
  assert.deepEqual(event.user, { id: 'u-2' })
})

test('breadcrumbs are scrubbed too', () => {
  const crumb = scrubBreadcrumb({ message: `fetch /api/approve/${token}/respond`, data: { url: `/approve/${token}`, token } })
  assert.ok(!JSON.stringify(crumb).includes(token))
})

test('ordinary diagnostic text is left readable', () => {
  assert.equal(scrubString('Could not load shoots (HTTP 502)'), 'Could not load shoots (HTTP 502)')
  assert.equal(scrubString('/admin/clients'), '/admin/clients')
})
