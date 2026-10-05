import { test } from 'node:test'
import assert from 'node:assert/strict'
import { categoryForType, DEFAULT_PREFS, inQuietHours, normalizePrefs, pushDecision } from '../src/lib/push/prefs'

// 2026-10-05 at the given IST wall-clock time
const ist = (clock: string) => new Date(`2026-10-05T${clock}:00+05:30`)

test('defaults are sensible: everything on, quiet hours 10pm to 8am IST', () => {
  assert.deepEqual(normalizePrefs(null), DEFAULT_PREFS)
  assert.equal(DEFAULT_PREFS.quiet_start, '22:00'); assert.equal(DEFAULT_PREFS.quiet_end, '08:00')
  assert.ok(Object.values(DEFAULT_PREFS.categories).every(Boolean))
})

test('quiet hours wrap midnight and are evaluated in IST', () => {
  assert.equal(inQuietHours(DEFAULT_PREFS, ist('22:00')), true)
  assert.equal(inQuietHours(DEFAULT_PREFS, ist('23:59')), true)
  assert.equal(inQuietHours(DEFAULT_PREFS, ist('03:30')), true)
  assert.equal(inQuietHours(DEFAULT_PREFS, ist('07:59')), true)
  assert.equal(inQuietHours(DEFAULT_PREFS, ist('08:00')), false, 'ends exactly at 8')
  assert.equal(inQuietHours(DEFAULT_PREFS, ist('15:00')), false)
  assert.equal(inQuietHours({ ...DEFAULT_PREFS, quiet_enabled: false }, ist('23:00')), false)
  assert.equal(inQuietHours({ ...DEFAULT_PREFS, quiet_start: '09:00', quiet_end: '17:00' }, ist('12:00')), true, 'a same-day window')
  assert.equal(inQuietHours({ ...DEFAULT_PREFS, quiet_start: '09:00', quiet_end: '09:00' }, ist('09:00')), false, 'empty window')
})

test('preferences only ever suppress push', () => {
  assert.equal(pushDecision('shoot_scheduled', DEFAULT_PREFS, ist('12:00')), 'send')
  assert.equal(pushDecision('shoot_scheduled', DEFAULT_PREFS, ist('23:00')), 'quiet_hours')
  const off = normalizePrefs({ categories: { ...DEFAULT_PREFS.categories, shoots: false } })
  assert.equal(pushDecision('shoot_scheduled', off, ist('12:00')), 'category_off')
  assert.equal(pushDecision('cut_submitted', off, ist('12:00')), 'send', 'other categories stay on')
})

test('every notification type belongs to a category and unknown types are not dropped', () => {
  for (const type of ['shoot_scheduled', 'raw_arrived', 'edit_assigned', 'revision', 'cut_submitted', 'approval', 'link_viewed', 'post_due', 'stale', 'storage'])
    assert.ok(categoryForType(type))
  assert.equal(categoryForType('something_new'), 'alerts')
  assert.equal(categoryForType('post_due'), 'posting')
})
