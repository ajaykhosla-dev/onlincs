import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cutFilename, daysLate, istClock, istDate, istMonthBounds, istToIso, slug } from '../src/lib/phase7/format'

test('download filenames are readable, never the raw storage key', () => {
  assert.equal(cutFilename('Ramana Dental', 'Smile makeover: before/after reel', 3), 'ramana-dental-smile-makeover-before-after-reel-v3.mp4')
  assert.equal(cutFilename('Khanna Jewellers', '  ', 1), 'khanna-jewellers-idea-v1.mp4')
  assert.ok(!/[^a-z0-9.-]/.test(cutFilename('Zoë & Co.', 'Café "launch" 🎉', 12)))
  assert.ok(cutFilename('a', 'x'.repeat(500), 2).length < 140)
  assert.equal(slug('--Hello  World--'), 'hello-world')
})

test('times are stored as UTC instants and shown in IST', () => {
  // 3:30pm IST is 10:00 UTC
  assert.equal(istToIso('2026-10-05', '15:30'), '2026-10-05T10:00:00.000Z')
  assert.equal(istClock('2026-10-05T10:00:00.000Z'), '15:30')
  // 11:00pm IST on the 5th is still the 5th in IST but 17:30 UTC; 1:00am IST on the 6th is 19:30 UTC on the 5th
  assert.equal(istDate('2026-10-05T19:30:00.000Z'), '2026-10-06')
  assert.equal(istDate(istToIso('2026-10-05', '23:00')), '2026-10-05')
})

test('an IST month is bounded by IST midnights, including December', () => {
  assert.deepEqual(istMonthBounds('2026-10'), { start: '2026-09-30T18:30:00.000Z', end: '2026-10-31T18:30:00.000Z' })
  assert.equal(istMonthBounds('2026-12').end, '2026-12-31T18:30:00.000Z')
})

test('days late counts whole IST calendar days', () => {
  const now = new Date('2026-10-05T05:00:00.000Z') // 10:30am IST on the 5th
  assert.equal(daysLate(istToIso('2026-10-05', '09:00'), now), 0)
  assert.equal(daysLate(istToIso('2026-10-02', '23:59'), now), 3)
  assert.equal(daysLate('2026-10-10T00:00:00.000Z', now), 0, 'a future time is never "late"')
})
