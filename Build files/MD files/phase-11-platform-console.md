# Phase 11 — RapidArc Platform Console

## Objective

Give RapidArc a control plane above the agency layer: onboard a new agency, store its Drive and B2 credentials safely, support it without compromising its data, and suspend it if it stops paying — all without touching the database by hand.

## Context

Phases 0 through 10 delivered a live product running for one agency. `agency_id` has been on every table since Phase 0, `agency_integrations` exists with encrypted credential columns, and `platform_owner` exists as a role.

This phase is deliberately last. You do not need a console to onboard your first agency — that was one inserted row. You need it the week a second agency says yes, and building it before that is how a client project quietly becomes an unfinished SaaS.

---

## Step 1 — Platform access

### What to do

Build the `/platform` route group, reachable only by `platform_owner`. Separate namespace, its own layout, visually distinct from the agency product so you always know which plane you are in.

Require two-factor authentication for this role — it is the only credential in the system that crosses tenant boundaries and it holds every agency's client footage behind it. Log every platform action to `activity_log` with `entity_type = 'platform'`.

### Checkpoint 1

- [ ] `/platform` is reachable by `platform_owner` and returns 403 for admin, brand_manager, editor and cameraman
- [ ] 2FA is enforced; a platform_owner without it cannot proceed past setup
- [ ] The console is visually distinct from the agency product at a glance
- [ ] Every platform action writes an `activity_log` row
- [ ] An agency admin cannot reach `/platform` by any route, including direct URL entry

---

## Step 2 — Agency onboarding

### What to do

Build the agency list — name, plan, status, client count, user count, storage used, created date — and the onboarding form: agency name, phone, address, services, notes, and the admin's Gmail for their invite.

Creating an agency writes the `agencies` row, an empty `agency_integrations` row, and invites the admin, who lands in a working but empty workspace.

Support editing agency details, display name and logo for light white-labelling.

### Checkpoint 2

- [ ] The list shows every agency with accurate counts
- [ ] Onboarding creates all three records and sends the admin invite
- [ ] The new admin signs in and reaches an empty but fully functional workspace
- [ ] The new agency sees none of Ashmeet SMMA's data, and vice versa
- [ ] Logo and display name changes appear in that agency's product only

---

## Step 3 — Credential management

### What to do

Build the integrations panel per agency: Drive service account email, service account key, Shared Drive ID, and B2 bucket, prefix, key ID and application key.

**Write-only from the UI.** A credential can be set and rotated, never read back. Display a fingerprint or last-four, never the value. Encrypt at the application layer with `CREDENTIAL_ENCRYPTION_KEY` — disk encryption alone is not enough. `agency_integrations` is reachable only through server-side routes using the service role, never through PostgREST.

Add a Test connection action running the same verification the Phase 0 scripts run — Shared Drive access and folder creation, and a B2 presigned round trip with a ranged request — reporting pass or fail per step.

Since you are doing technical onboarding yourself, this panel is where you paste what the agency sends you — make it forgiving about whitespace and escaped newlines in service account keys.

### Checkpoint 3

- [ ] Saving a credential encrypts it; the raw value is not readable in the database
- [ ] The UI never returns a stored credential — only a fingerprint
- [ ] Rotating replaces the value and logs the rotation without logging the value
- [ ] Test connection runs the real Drive and B2 checks and reports per step
- [ ] `agency_integrations` returns nothing through the public API, only through server routes
- [ ] A service account key pasted with escaped newlines is accepted and works
- [ ] A wrong credential produces a clear failure naming which check failed

---

## Step 4 — Support access

### What to do

Build view-as-agency: switch the platform owner's effective `agency_id` to inspect a tenant's data for debugging.

Make it impossible to forget you are inside someone's account — a persistent banner naming the agency and offering an exit, on every screen. Write an `activity_log` row on entry and exit, including duration. Read-only by default; any write requires a separate explicit elevation, also logged.

The alternative — quietly querying a customer's data with the service role — is how trust evaporates the first time a client asks whether you can see their footage.

### Checkpoint 4

- [ ] Entering shows the agency's real data with the banner on every screen
- [ ] The banner cannot be dismissed while the session is active
- [ ] Entry and exit both log with timestamps and duration
- [ ] Writes are blocked by default; elevation is separate and logged
- [ ] Exiting fully restores the platform context with no residual access
- [ ] The viewed agency's admin can see the support access in their own audit trail

---

## Step 5 — Lifecycle and billing state

### What to do

Support suspending an agency: `status = 'suspended'` blocks sign-in for all its users with a clear message, while destroying nothing. Reactivation restores access instantly.

Show per-agency usage — clients, users, storage, content items this month — enough to support a conversation about pricing without building a billing system, which is out of scope.

Add an export of an agency's complete data as JSON plus a media manifest, so leaving is possible. An agency that cannot leave will not sign up.

### Checkpoint 5

- [ ] Suspending blocks sign-in for every user of that agency with a clear message
- [ ] Suspension destroys no data and reactivation restores access immediately
- [ ] Usage figures match independently run queries
- [ ] Data export produces complete, valid JSON plus a media manifest
- [ ] Suspending one agency has no effect on any other

---

## Step 6 — Multi-tenant verification

### What to do

With two real agencies configured, re-run and extend the Phase 0 isolation suite across every feature built in Phases 3 through 9 — not just tables, but real user journeys.

Verify specifically: agency A's Drive credentials never touch agency B's Shared Drive, B2 keys are prefixed per agency, magic-link tokens resolve only within their own agency, notifications never cross tenants, and analytics aggregate within one agency only.

### Checkpoint 6

- [ ] The isolation suite covers every table and every API route
- [ ] Agency A's service account cannot reach agency B's Shared Drive, and its B2 key cannot read agency B's prefix
- [ ] B2 keys are prefixed per agency and cross-prefix access fails
- [ ] A magic-link token from agency A returns not-found under agency B
- [ ] Notifications never deliver across agencies
- [ ] Analytics totals for agency A exclude all of agency B's records
- [ ] Deliberately breaking one RLS policy makes the suite fail

---

## Self-Audit Instruction

Before declaring this phase complete, you must:

1. Re-read every checkpoint in this phase file
2. Test each one for real, with two genuinely separate agencies configured with different credentials
3. Return a structured report:
   ✅ [Checkpoint] — Pass
   ⚠️ [Checkpoint] — Partial: [specific reason]
   ❌ [Checkpoint] — Fail: [specific reason]
4. Fix all failures and partials before reporting phase complete.
5. Only say "Phase 11 Complete" when every checkbox is green.
6. Update `docs/progress.md` — this is the final phase, so record the complete build state and any outstanding items for v2.

## Final Phase 11 Checklist

- [ ] Platform console live, 2FA enforced, fully audited
- [ ] Agency onboarding creating working, isolated workspaces
- [ ] Credentials encrypted and write-only, with a real connection test
- [ ] Support access banner-visible, logged, read-only by default
- [ ] Suspension, usage visibility and full data export working
- [ ] Multi-tenant isolation verified across every feature
- [ ] Self-audit passed with all green
- [ ] `docs/progress.md` updated with final build state
