# Phase 3 — Clients & Content Planner

## Objective

Make the pipeline spine real. Clients, scope of work, and content items become live database records, the status state machine is implemented as the single path through which any item changes state, and the Content Planner and Clients screens read and write real data.

This is the phase everything after it depends on.

## Context

Phase 2 delivered real auth and role-scoped routing over fixture data. Phase 0 seeded `clients`, `client_scope`, `content_items`, `monthly_plans` and `activity_log`.

A content item is the central entity — shoots, edits, approvals and posts all hang off it. Get the state machine right here and later phases become straightforward; get it wrong and every later phase inherits the mess.

---

## Step 1 — Clients

### What to do

Build the clients API and wire `/admin/clients` and `/manager/clients` to it. Admin sees all clients in the agency; a brand manager sees only those where `manager_id` is their own id — enforced through `canAccess()`, not a client-side filter.

Implement create, update, assign manager, and change status. The Add client form captures name, handle, niche, manager and monthly scope of work, writing a `client_scope` row for the current month.

Compute "scope delivered" as the count of that client's content items at status `posted` in the selected month, over the scope total. This is a derived value — never store it.

### Checkpoint 1

- [ ] `/admin/clients` lists all 6 clients with codes, handles, niches and managers matching the database
- [ ] `/manager/clients` signed in as Jaspreet returns exactly 2 rows; the API returns 403 for another manager's client id
- [ ] Creating a client writes both a `clients` and a `client_scope` row, and it appears without a manual refresh
- [ ] Scope delivered matches a hand-run SQL count for all 6 clients
- [ ] Reassigning a client to another manager immediately changes what each manager sees
- [ ] Every create, update and reassign writes an `activity_log` row

---

## Step 2 — The status state machine

### What to do

Create `lib/pipeline/transitions.ts` — the only place a content item's status may change. It exports `transition(itemId, toStatus, actor)` which validates the move against an allowed-transitions map, applies it, and writes `activity_log` in the same database transaction.

Encode the pipeline from `docs/context.md`, including both revision loops: `cut_submitted → changes_requested → with_editor` and `with_client → client_changes → with_editor`. An item may return to `client_changes` after `internally_approved`.

Define who may perform each transition by role. A cameraman cannot approve a cut; an editor cannot mark something posted.

Invalid transitions fail loudly with a message naming the current and attempted status. No direct status writes anywhere else in the codebase.

### Checkpoint 2

- [ ] `transition()` unit tests cover every valid move in the pipeline and reject a representative set of invalid ones
- [ ] Attempting `planned → posted` fails with a message naming both statuses
- [ ] An editor attempting `internally_approved` receives 403
- [ ] Both revision loops work, and an item can reach `with_editor` from either direction
- [ ] Every transition writes one `activity_log` row with actor, from-state and to-state
- [ ] A forced failure mid-transition rolls back — no status change without its log row
- [ ] `grep -rn "status" app/api/` shows no direct status assignment outside `lib/pipeline/`

---

## Step 3 — Content items

### What to do

Build content item CRUD. Fields per the schema: title, type, concept, script, instructions for editor, instructions for cameraman, reference links, planned date and time, status, assigned editor, deadline.

Scope every query by client, and every client by `canAccess()`. Creating an item starts it at `planned`.

### Checkpoint 3

- [ ] Creating an item persists all fields including the jsonb reference links array
- [ ] New items start at `planned` — status cannot be set directly on create
- [ ] A brand manager creating an item for another manager's client receives 403
- [ ] Editing does not alter status; status changes only through `transition()`
- [ ] Deleting is soft — status moves to `archived` and the row survives

---

## Step 4 — Content Planner

### What to do

Wire the planner screens. Client selector, month navigation, calendar view showing each day's items with type and status tags, and the list view toggle showing date, idea name, type and status.

An empty day shows "Nothing planned for [date]" with a Plan button opening the modal — Type, Date & time, Reference, Instructions for editor, Instructions for cameraman, Image references, Status, Notes — which creates a real content item.

Clicking an existing item opens the same modal in edit mode.

### Checkpoint 4

- [ ] The planner renders September 2026 items on their correct dates for the selected client
- [ ] Month navigation loads the correct month's data
- [ ] Calendar and list views show the same items for the same month
- [ ] The Plan modal creates an item that appears immediately on the correct day
- [ ] Editing an existing item saves and re-renders
- [ ] Status tags use the colour mapping from context.md and are paired with text
- [ ] A brand manager sees only their own clients in the selector

---

## Step 5 — Monthly plans

### What to do

Implement `monthly_plans` as the calendar-level approval object, separate from per-cut approval. A plan is `draft`, then `sent_to_client`, then `approved` or `changes_requested`.

In this phase the brand manager sets the status manually — the client-facing side arrives in Phase 6. Approving a month transitions every `planned` item in it to `calendar_approved` through `transition()`, in one database transaction.

Show the month's plan status in the planner header.

### Checkpoint 5

- [ ] Approving September moves all its `planned` items to `calendar_approved`
- [ ] The bulk transition is atomic — a forced failure leaves every item unchanged
- [ ] Each item's transition writes its own `activity_log` row
- [ ] Plan status renders in the planner header and updates without a refresh
- [ ] Items already past `calendar_approved` are untouched by a re-approval

---

## Step 6 — Retire the fixtures

### What to do

Remove `lib/fixtures/` imports from every clients and planner screen. Add loading and error states, and a real empty state for a client with no planned content.

Fixtures for screens not yet wired — den, posting, calendar, team — stay until their phases.

### Checkpoint 6

- [ ] No clients or planner screen imports from `lib/fixtures/`
- [ ] Every wired screen has loading, error and empty states
- [ ] A database error renders the error state rather than a blank screen or a crash
- [ ] Verdant Gym, which has no content, shows the empty state

---

## Self-Audit Instruction

Before declaring this phase complete, you must:

1. Re-read every checkpoint in this phase file
2. Test each one for real — run the query, click through the flow as each role
3. Return a structured report:
   ✅ [Checkpoint] — Pass
   ⚠️ [Checkpoint] — Partial: [specific reason]
   ❌ [Checkpoint] — Fail: [specific reason]
4. Fix all failures and partials before reporting phase complete.
5. Only say "Phase 3 Complete" when every checkbox is green.
6. Update `docs/progress.md` with what was built, deviations, and anything carried into Phase 4.

## Final Phase 3 Checklist

- [ ] Clients live, scoped by role, with scope delivered computed correctly
- [ ] State machine is the only path to a status change, fully tested, logging every move
- [ ] Content item CRUD complete and permission-scoped
- [ ] Planner reads and writes real data in both views
- [ ] Monthly plan approval bulk-transitions atomically
- [ ] Fixtures removed from all wired screens
- [ ] Self-audit passed with all green
- [ ] `docs/progress.md` updated
