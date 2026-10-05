import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isTransient, RetryExhaustedError, withRetry } from '../src/lib/retry'

const noSleep = async () => {}

test('transient failures are retried and the call eventually succeeds', async () => {
  let calls = 0
  const result = await withRetry(async () => { calls++; if (calls < 3) throw Object.assign(new Error('boom'), { code: 503 }); return 'ok' }, { service: 'Google Drive', sleep: noSleep })
  assert.equal(result, 'ok'); assert.equal(calls, 3)
})

test('a simulated Drive timeout retries, then reports clearly which service failed', async () => {
  let calls = 0
  const waits: number[] = []
  await assert.rejects(withRetry(async () => { calls++; throw Object.assign(new Error('socket hang up'), { code: 'ETIMEDOUT' }) },
    { service: 'Google Drive', attempts: 4, baseMs: 100, sleep: async (ms) => { waits.push(ms) } }),
    (error: unknown) => error instanceof RetryExhaustedError && /Google Drive is not responding right now\. We tried 4 times/.test(error.message))
  assert.equal(calls, 4)
  assert.equal(waits.length, 3, 'it waits between attempts, not after the last')
  assert.ok(waits[1] > waits[0] && waits[2] > waits[1], 'backoff grows')
})

test('permission and not-found errors are never retried', async () => {
  for (const status of [400, 401, 403, 404]) {
    let calls = 0
    await assert.rejects(withRetry(async () => { calls++; throw Object.assign(new Error('nope'), { status }) }, { service: 'B2', sleep: noSleep }), /nope/)
    assert.equal(calls, 1, `status ${status}`)
  }
})

test('transient detection covers HTTP statuses, network codes and AWS error names', () => {
  assert.ok(isTransient({ status: 429 })); assert.ok(isTransient({ code: 'ECONNRESET' })); assert.ok(isTransient({ name: 'SlowDown' }))
  assert.ok(isTransient({ $metadata: { httpStatusCode: 503 } })); assert.ok(isTransient({ response: { status: 502 } }))
  assert.ok(!isTransient({ status: 403 })); assert.ok(!isTransient(new Error('invalid input')))
})
