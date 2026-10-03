import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canEnterGroup, homeForRole, safeReturnTo } from '../src/lib/auth/routing'

test('each workspace role has one home and cannot enter another group', () => {
  const cases = [
    ['admin', 'admin', '/admin/clients'],
    ['brand_manager', 'manager', '/manager/clients'],
    ['editor', 'editor', '/editor/todo'],
    ['cameraman', 'cameraman', '/cameraman/shoots'],
  ] as const
  for (const [role, group, home] of cases) {
    assert.equal(homeForRole(role), home)
    for (const other of ['admin', 'manager', 'editor', 'cameraman'] as const) {
      assert.equal(canEnterGroup(role, other), other === group, `${role} in ${other}`)
    }
  }
  assert.equal(homeForRole('client_viewer'), null)
  assert.equal(homeForRole('platform_owner'), '/platform')
  for (const group of ['admin', 'manager', 'editor', 'cameraman', 'platform'] as const) {
    assert.equal(canEnterGroup('platform_owner', group), true)
  }
})

test('OAuth return targets stay on local workspace paths', () => {
  assert.equal(safeReturnTo('/editor/todo?view=mine'), '/editor/todo?view=mine')
  for (const value of ['//evil.example', 'https://evil.example', '/\\evil.example']) {
    assert.equal(safeReturnTo(value), null)
  }
})
