/**
 * Unit tests for lib/auth/can-access.ts
 * Run: npx tsx tests/can-access.test.ts
 */

import { canAccess } from '@/lib/auth/can-access'
import type { User } from '@/types/database'

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'u-test',
  agency_id: 'ag-test',
  email: 'test@test.com',
  full_name: 'Test User',
  initials: 'TU',
  role: 'admin',
  avatar_gradient: 'linear-gradient(140deg,#8F80F7,#5A4AD8)',
  phone: null,
  is_active: true,
  ...overrides,
})

let passed = 0
let failed = 0

function test(description: string, actual: boolean, expected: boolean) {
  if (actual === expected) {
    console.log(`  ✓ ${description}`)
    passed++
  } else {
    console.error(`  ✗ ${description} — expected ${expected}, got ${actual}`)
    failed++
  }
}

console.log('\n=== canAccess Unit Tests ===\n')

// ── platform_owner — all resources, all actions ──────────────────────────
console.log('platform_owner:')
const platformOwner = makeUser({ role: 'platform_owner' })
const allResources = ['content_item', 'client', 'shoot', 'deliverable', 'upload_session', 'agency'] as const
const allActions = ['read', 'write', 'delete'] as const

for (const resource of allResources) {
  for (const action of allActions) {
    test(`${action} ${resource}`, canAccess(platformOwner, resource, action), true)
  }
}

// ── admin — all resources within agency ──────────────────────────────────
console.log('\nadmin:')
const admin = makeUser({ role: 'admin' })
for (const resource of allResources) {
  for (const action of allActions) {
    test(`${action} ${resource}`, canAccess(admin, resource, action), true)
  }
}

// ── brand_manager ────────────────────────────────────────────────────────
console.log('\nbrand_manager:')
const brandManager = makeUser({ role: 'brand_manager' })
test('read client', canAccess(brandManager, 'client', 'read'), true)
test('read content_item', canAccess(brandManager, 'content_item', 'read'), true)
test('write content_item', canAccess(brandManager, 'content_item', 'write'), true)
test('read shoot', canAccess(brandManager, 'shoot', 'read'), true)
test('write shoot', canAccess(brandManager, 'shoot', 'write'), true)
test('read deliverable', canAccess(brandManager, 'deliverable', 'read'), true)
test('write agency', canAccess(brandManager, 'agency', 'write'), false)
test('delete client', canAccess(brandManager, 'client', 'delete'), false)

// ── editor ───────────────────────────────────────────────────────────────
console.log('\neditor:')
const editor = makeUser({ role: 'editor' })
test('read content_item', canAccess(editor, 'content_item', 'read'), true)
test('write content_item', canAccess(editor, 'content_item', 'write'), true)
test('read client', canAccess(editor, 'client', 'read'), true)
test('read deliverable', canAccess(editor, 'deliverable', 'read'), true)
test('write deliverable', canAccess(editor, 'deliverable', 'write'), true)
test('write shoot', canAccess(editor, 'shoot', 'write'), false)
test('write agency', canAccess(editor, 'agency', 'write'), false)
test('delete content_item', canAccess(editor, 'content_item', 'delete'), false)

// ── cameraman ────────────────────────────────────────────────────────────
console.log('\ncameraman:')
const cameraman = makeUser({ role: 'cameraman' })
test('read shoot', canAccess(cameraman, 'shoot', 'read'), true)
test('write shoot', canAccess(cameraman, 'shoot', 'write'), true)
test('read content_item', canAccess(cameraman, 'content_item', 'read'), true)
test('read upload_session', canAccess(cameraman, 'upload_session', 'read'), true)
test('write client', canAccess(cameraman, 'client', 'write'), false)
test('write deliverable', canAccess(cameraman, 'deliverable', 'write'), false)
test('write agency', canAccess(cameraman, 'agency', 'write'), false)

// ── Negative cases ───────────────────────────────────────────────────────
console.log('\nnegative cases:')
const noRole = makeUser({ role: 'unknown' as any })
test('unknown role cannot do anything', canAccess(noRole, 'content_item', 'read'), false)

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`)
process.exit(failed > 0 ? 1 : 0)
