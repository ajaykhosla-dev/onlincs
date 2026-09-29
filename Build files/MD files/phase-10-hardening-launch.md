# Phase 10 — Hardening & Launch

## Objective

Turn a working application into one a real team uses every day: installable as a PWA, tolerant of bad connectivity in the field, honest about storage, instrumented for failure, and loaded with the agency's actual clients rather than seed data.

## Context

Phases 0 through 9 delivered the complete pipeline with analytics. Everything works against seeded data on good connections in a browser tab.

Two things have been deferred to here on purpose: offline reading for the cameraman, who has "internet issue" written on his own wireframe, and the storage view, which is load-bearing because raw deletion is manual against a 2TB pooled Drive ceiling.

---

## Step 1 — PWA

### What to do

Add a web app manifest with name, short name, icons at all required sizes, theme colour matching the violet, and standalone display. Extend the Phase 8 service worker to cache the app shell and static assets with a sensible update strategy.

Add an install prompt shown at a natural moment, not on first load. Verify installation on Android and on iOS Safari, which handles PWAs differently and needs testing on a real device.

### Checkpoint 1

- [ ] The app installs from Chrome on Android and appears with the correct icon and name
- [ ] The app installs from Safari on iOS and launches standalone without browser chrome
- [ ] The app shell loads from cache on a repeat visit, confirmed in the Network tab
- [ ] A new deployment updates the service worker without requiring a manual cache clear
- [ ] Lighthouse PWA audit passes
- [ ] The install prompt appears at a sensible moment and can be dismissed permanently

---

## Step 2 — Offline for the cameraman

### What to do

Cache the signed-in cameraman's upcoming shoots — times, clients, locations, concepts, scripts and reference links — so the full schedule is readable with no connection. He is standing at a client site on 2G; this is the one screen that must work there.

Show an offline banner. Queue the Mark raw uploaded toggle while offline and sync on reconnect, with the queued state visible so nothing looks lost. Actions that genuinely need a connection are disabled with an explanation rather than failing silently.

### Checkpoint 2

- [ ] With the network disabled, the shoots calendar renders fully from cache
- [ ] Shoot detail including script and concept is readable offline
- [ ] The offline banner appears and disappears correctly
- [ ] Marking raw uploaded offline queues visibly and syncs on reconnect
- [ ] A queued action surviving an app restart still syncs
- [ ] Raw upload and Drive links offline show a clear "needs connection" message
- [ ] Tested on a real phone with airplane mode, not just dev tools throttling

---

## Step 3 — Storage management

### What to do

Build the storage view in admin settings: total Drive pool used against the 2TB ceiling, broken down by client and by shoot, largest consumers first. Show B2 usage for cuts separately — it is small and has no ceiling.

Flag raw footage eligible for deletion — shoots whose content items all reached `posted` more than 30 days ago. Deletion is manual and explicit: select shoots, confirm with a clear statement of what is being permanently removed, delete the folders from Drive, remove their `raw_files` rows, and log it. Also surface `upload_sessions` left `active` or `expired` with no completed file.

Threshold warnings at 70% and 85% appear here and fire through the Phase 8 alerts.

**Deletion is irreversible.** Require typed confirmation, and never offer a bulk delete-all.

### Checkpoint 3

- [ ] Storage used matches Drive's own reported figure within a small margin
- [ ] The breakdown by client and shoot sums to the total
- [ ] Eligible-for-deletion lists only shoots fully posted over 30 days ago
- [ ] Deleting removes the folders from Drive, clears their `raw_files` rows, and logs actor and freed bytes
- [ ] Deletion requires typed confirmation; there is no delete-all
- [ ] The 70% and 85% warnings render and fire alerts
- [ ] A brand manager can see storage but only an admin can delete

---

## Step 4 — Error handling and instrumentation

### What to do

Audit every route for loading, empty and error states. No blank screens, no infinite spinners, no raw stack traces reaching a user.

Wire Sentry with source maps, scrubbing tokens, PINs and credentials from every payload. Add error boundaries per route group so one broken screen does not white-screen the app. Retry transient Drive and B2 failures with backoff, and surface a clear message when retries are exhausted.

### Checkpoint 4

- [ ] Every one of the 18 routes has loading, empty and error states, verified individually
- [ ] A forced API failure renders the error state with a retry, never a stack trace
- [ ] Sentry receives errors with source maps resolving to real line numbers
- [ ] No token, PIN or credential appears in any Sentry payload — verified by triggering an error on the approval page
- [ ] A thrown error in one route group leaves the rest of the app usable
- [ ] A simulated Drive timeout retries and then reports clearly

---

## Step 5 — Security and performance review

### What to do

Run a focused review before real client data enters the system:

- Re-run the Phase 0 cross-tenant isolation suite against the now-complete app
- Confirm no service-role key, Drive credential, B2 key or session URI is reachable from the client bundle
- Verify every API route calls `canAccess()` — no unprotected handlers
- Confirm approval link tokens and PINs are hashed and rate-limited
- Check bundle size, add indexes for any slow query, and confirm no N+1 queries on list screens

### Checkpoint 5

- [ ] The isolation suite passes against the complete application
- [ ] `grep` across the client bundle finds no secret values
- [ ] Every route in `app/api/` calls `canAccess()` — enumerated and confirmed one by one
- [ ] Every list screen loads in under 2 seconds on the seeded dataset
- [ ] No query on any screen exceeds 300ms, measured in Supabase logs
- [ ] Lighthouse performance scores above 85 on one route per role

---

## Step 6 — Migration and go-live

### What to do

Replace seed data with the agency's real clients, team and current month's plan. Onboard each user with their Google account, assign clients to managers, and enter in-flight work so the system reflects reality on day one — an empty tool on launch day gets abandoned.

Provision Drive folders for existing clients, grant editors read access to the Shared Drive, and connect current shoots.

Run a session per role with the actual people. Watch the cameraman use it on his own phone without help — if he needs explaining, fix the screen rather than the person.

Agree a two-week parallel period where WhatsApp still exists as a fallback, then cut over.

### Checkpoint 6

- [ ] Real clients, scope and team are loaded and correct
- [ ] Every team member has signed in successfully with their own account
- [ ] The current month's content plan is entered and reflects reality
- [ ] Drive folders exist for all active clients and editors can open them
- [ ] Each role has completed their core flow unaided, observed
- [ ] The cameraman completed a real shoot-to-upload cycle through the wrapper, including one interrupted-and-resumed upload
- [ ] Rollback plan documented in case cutover fails

---

## Self-Audit Instruction

Before declaring this phase complete, you must:

1. Re-read every checkpoint in this phase file
2. Test each one for real — on real devices, on real networks, with the real team. This phase cannot be verified from a desk.
3. Return a structured report:
   ✅ [Checkpoint] — Pass
   ⚠️ [Checkpoint] — Partial: [specific reason]
   ❌ [Checkpoint] — Fail: [specific reason]
4. Fix all failures and partials before reporting phase complete.
5. Only say "Phase 10 Complete" when every checkbox is green.
6. Update `docs/progress.md` with what was built, deviations, and anything carried into Phase 11.

## Final Phase 10 Checklist

- [ ] Installable PWA verified on Android and iOS
- [ ] Cameraman schedule fully readable offline with queued sync
- [ ] Storage view live with eligible-for-deletion flagging and safe manual deletion
- [ ] Every route has proper states; Sentry instrumented with secrets scrubbed
- [ ] Security and performance review passed, isolation suite green
- [ ] Real data migrated, team onboarded, each role observed completing their flow
- [ ] Self-audit passed with all green
- [ ] `docs/progress.md` updated
