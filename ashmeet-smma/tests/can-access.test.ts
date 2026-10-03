import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canAccess, type Resource, type Action } from '../src/lib/auth/can-access'
import type { User, Role } from '../src/types/database'

const user = (role: Role, id = `u-${role}`, agency_id = 'ag-1', is_active = true): User => ({
  id, agency_id, role, is_active, email: `${id}@x.com`, full_name: id, initials: 'XX',
  avatar_gradient: '', phone: null,
})

const admin = user('admin')
const mgr = user('brand_manager')
const otherMgr = user('brand_manager', 'u-mgr2')
const editor = user('editor')
const otherEditor = user('editor', 'u-ed2')
const cam = user('cameraman')
const otherCam = user('cameraman', 'u-cam2')
const owner = user('platform_owner', 'u-owner', 'ag-platform')

const A = 'ag-1'
const client: Resource = { type: 'client', agency_id: A, manager_id: mgr.id, assigned_editor_ids: [editor.id] }
const item: Resource = { type: 'content_item', agency_id: A, client_manager_id: mgr.id, assigned_editor_id: editor.id, shoot_cameraman_ids: [cam.id] }
const shoot: Resource = { type: 'shoot', agency_id: A, client_manager_id: mgr.id, cameraman_id: cam.id }
const deliverable: Resource = { type: 'deliverable', agency_id: A, client_manager_id: mgr.id, assigned_editor_id: editor.id }
const session: Resource = { type: 'upload_session', agency_id: A, started_by: cam.id, cameraman_id: cam.id }
const agency: Resource = { type: 'agency', agency_id: A }
const all = [client, item, shoot, deliverable, session, agency]
const actions: Action[] = ['read', 'write', 'delete']

test('platform_owner crosses agencies, all actions', () => {
  for (const r of all) for (const a of actions) assert.equal(canAccess(owner, r, a), true)
})

test('admin: everything in own agency, nothing in another', () => {
  for (const r of all) for (const a of actions) {
    assert.equal(canAccess(admin, r, a), true)
    assert.equal(canAccess(admin, { ...r, agency_id: 'ag-2' } as Resource, a), false)
  }
})

test('brand_manager: only own clients and their items; never agency or sessions', () => {
  for (const r of [client, item, shoot, deliverable]) {
    assert.equal(canAccess(mgr, r, 'read'), true)
    assert.equal(canAccess(mgr, r, 'write'), true)
    assert.equal(canAccess(otherMgr, r, 'read'), false)
    assert.equal(canAccess(otherMgr, r, 'write'), false)
  }
  assert.equal(canAccess(mgr, client, 'delete'), false)
  assert.equal(canAccess(mgr, agency, 'read'), false)
  assert.equal(canAccess(mgr, session, 'read'), false)
})

test('editor: only assigned items/deliverables; read-only parent client', () => {
  for (const r of [item, deliverable]) {
    assert.equal(canAccess(editor, r, 'read'), true)
    assert.equal(canAccess(editor, r, 'write'), true)
    assert.equal(canAccess(editor, r, 'delete'), false)
    assert.equal(canAccess(otherEditor, r, 'read'), false)
  }
  assert.equal(canAccess(editor, client, 'read'), true)
  assert.equal(canAccess(editor, client, 'write'), false)
  assert.equal(canAccess(otherEditor, client, 'read'), false)
  for (const r of [shoot, session, agency]) assert.equal(canAccess(editor, r, 'read'), false)
})

test('cameraman: only own shoots, linked items read-only, own sessions', () => {
  assert.equal(canAccess(cam, shoot, 'read'), true)
  assert.equal(canAccess(cam, shoot, 'write'), true)
  assert.equal(canAccess(otherCam, shoot, 'read'), false)
  assert.equal(canAccess(cam, item, 'read'), true)
  assert.equal(canAccess(cam, item, 'write'), false)
  assert.equal(canAccess(otherCam, item, 'read'), false)
  assert.equal(canAccess(cam, session, 'write'), true)
  assert.equal(canAccess(otherCam, session, 'write'), false)
  for (const r of [client, deliverable, agency]) assert.equal(canAccess(cam, r, 'read'), false)
})

test('cross-agency and inactive users are denied', () => {
  for (const u of [mgr, editor, cam]) for (const r of all) {
    assert.equal(canAccess({ ...u, agency_id: 'ag-2' }, r, 'read'), false)
    assert.equal(canAccess({ ...u, is_active: false }, r, 'read'), false)
  }
})
