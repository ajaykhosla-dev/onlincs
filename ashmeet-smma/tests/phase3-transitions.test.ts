import assert from 'node:assert/strict'
import test from 'node:test'
import { allowedTransitions, validateTransition } from '../src/lib/pipeline/policy.ts'

test('every pipeline edge is allowed for a manager', () => {
  for (const [from, destinations] of Object.entries(allowedTransitions)) {
    for (const to of destinations) assert.doesNotThrow(() => validateTransition(from as keyof typeof allowedTransitions, to, 'brand_manager'))
  }
})

test('revision loops lead back to the editor', () => {
  assert.doesNotThrow(() => validateTransition('cut_submitted', 'changes_requested', 'brand_manager'))
  assert.doesNotThrow(() => validateTransition('changes_requested', 'with_editor', 'brand_manager'))
  assert.doesNotThrow(() => validateTransition('with_client', 'client_changes', 'brand_manager'))
  assert.doesNotThrow(() => validateTransition('client_changes', 'with_editor', 'brand_manager'))
  assert.doesNotThrow(() => validateTransition('internally_approved', 'client_changes', 'brand_manager'))
})

test('invalid status and forbidden role give specific errors', () => {
  assert.throws(() => validateTransition('planned', 'posted', 'admin'), /planned to posted/)
  assert.throws(() => validateTransition('cut_submitted', 'internally_approved', 'editor'), /editor.*internally_approved/)
  assert.throws(() => validateTransition('cut_submitted', 'internally_approved', 'cameraman'), /cameraman.*internally_approved/)
})
