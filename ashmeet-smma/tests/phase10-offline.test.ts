import { test } from 'node:test'
import assert from 'node:assert/strict'

// A minimal localStorage so the offline store can be exercised outside a browser.
const memory = new Map<string, string>()
Object.assign(globalThis, { localStorage: { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => void memory.set(k, v), removeItem: (k: string) => void memory.delete(k) } })

test('the schedule is saved per user and read back', async () => {
  const { saveSchedule, loadSchedule } = await import('../src/lib/offline/store')
  saveSchedule('u-7', { shoots: [{ id: 's1' }] })
  assert.deepEqual(loadSchedule<{ shoots: { id: string }[] }>('u-7')?.data, { shoots: [{ id: 's1' }] })
  assert.equal(loadSchedule('u-8'), null, 'another person on the same phone sees nothing')
})

test('a queued mark survives a restart, is not duplicated, and syncs once the network returns', async () => {
  const { enqueueMark, readQueue, flushQueue } = await import('../src/lib/offline/store')
  enqueueMark('u-7', 'shoot-1', 'item-1'); enqueueMark('u-7', 'shoot-1', 'item-1'); enqueueMark('u-7', 'shoot-2', 'item-9')
  assert.equal(readQueue('u-7').length, 2, 'no duplicates')
  // network down: nothing is lost
  const down = await flushQueue('u-7', async () => { throw new TypeError('Failed to fetch') })
  assert.equal(down.sent, 0); assert.equal(readQueue('u-7').length, 2)
  // a server error keeps the entry too
  assert.equal((await flushQueue('u-7', async () => new Response('', { status: 503 }))).remaining.length, 2)
  // back online
  const sentTo: string[] = []
  const up = await flushQueue('u-7', async (entry) => { sentTo.push(`${entry.shootId}/${entry.itemId}`); return new Response('{}', { status: 200 }) })
  assert.equal(up.sent, 2); assert.deepEqual(sentTo, ['shoot-1/item-1', 'shoot-2/item-9']); assert.equal(readQueue('u-7').length, 0)
})

test('an entry the server can never accept is dropped instead of retrying forever', async () => {
  const { enqueueMark, readQueue, flushQueue } = await import('../src/lib/offline/store')
  enqueueMark('u-9', 'gone', 'item')
  const result = await flushQueue('u-9', async () => new Response('', { status: 404 }))
  assert.equal(result.sent, 0); assert.equal(readQueue('u-9').length, 0)
})

test('a 401 keeps the queued mark, and a mark queued during a flush is not lost', async () => {
  const { enqueueMark, readQueue, flushQueue } = await import('../src/lib/offline/store')
  enqueueMark('u-11', 's', 'i1')
  assert.equal((await flushQueue('u-11', async () => new Response('', { status: 401 }))).remaining.length, 1)
  await flushQueue('u-11', async () => { enqueueMark('u-11', 's', 'i2'); return new Response('{}', { status: 200 }) })
  assert.deepEqual(readQueue('u-11').map((e) => e.itemId), ['i2'])
})
