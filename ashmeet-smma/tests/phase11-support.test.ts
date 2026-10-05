import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'

process.env.CREDENTIAL_ENCRYPTION_KEY = randomBytes(32).toString('base64')

test('outside a support session nothing is blocked', async () => {
  const { supportWriteBlocked } = await import('../src/lib/platform/guard')
  assert.equal(supportWriteBlocked({ method: 'POST', pathname: '/api/clients' }), false)
})

test('a support session is read-only until elevated, and elevation belongs to one session', async () => {
  const { supportWriteBlocked } = await import('../src/lib/platform/guard')
  const { ELEVATION_COOKIE, SUPPORT_COOKIE, issue } = await import('../src/lib/platform/signed')
  const support = issue(SUPPORT_COOKIE, 'sess-1', 600)
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) assert.equal(supportWriteBlocked({ method, pathname: '/api/clients', supportCookie: support }), true, method)
  for (const method of ['GET', 'HEAD', 'OPTIONS']) assert.equal(supportWriteBlocked({ method, pathname: '/api/clients', supportCookie: support }), false, method)
  assert.equal(supportWriteBlocked({ method: 'POST', pathname: '/api/platform/support/exit', supportCookie: support }), false, 'the owner can always exit and manage agencies')
  assert.equal(supportWriteBlocked({ method: 'POST', pathname: '/api/clients', supportCookie: support, elevationCookie: issue(ELEVATION_COOKIE, 'sess-1', 600) }), false, 'elevated')
  assert.equal(supportWriteBlocked({ method: 'POST', pathname: '/api/clients', supportCookie: support, elevationCookie: issue(ELEVATION_COOKIE, 'sess-OTHER', 600) }), true, 'another session\'s elevation does not count')
  assert.equal(supportWriteBlocked({ method: 'POST', pathname: '/api/clients', supportCookie: support, elevationCookie: issue(SUPPORT_COOKIE, 'sess-1', 600) }), true, 'a session cookie cannot be replayed as an elevation')
})

test('expired or tampered cookies grant nothing and do not count as a session', async () => {
  const { verify, issue, SUPPORT_COOKIE } = await import('../src/lib/platform/signed')
  const { supportWriteBlocked } = await import('../src/lib/platform/guard')
  assert.equal(verify(SUPPORT_COOKIE, issue(SUPPORT_COOKIE, 's', -5)), null, 'expired')
  const good = issue(SUPPORT_COOKIE, 's', 600)
  assert.equal(verify(SUPPORT_COOKIE, good), 's')
  assert.equal(verify(SUPPORT_COOKIE, good.slice(0, -2) + 'xx'), null, 'tampered signature')
  assert.equal(verify(SUPPORT_COOKIE, good.replace('s.', 'z.')), null, 'tampered id')
  assert.equal(supportWriteBlocked({ method: 'POST', pathname: '/api/clients', supportCookie: 'garbage' }), false, 'garbage is simply not a session')
})
