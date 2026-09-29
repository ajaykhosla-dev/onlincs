# Phase 8 — Notifications & Nudges

## Objective

Make the system push work at people instead of waiting to be checked. Web push on every event that needs someone's attention, an in-app notification centre, and cron-driven alerts when something has been sitting too long.

## Context

Phases 3 through 7 built the full pipeline. Every meaningful state change already writes to `activity_log`, which is what this phase listens to. `push_subscriptions` and `notifications` exist in the schema, and VAPID keys were generated in Phase 0.

**This phase is the reason the product succeeds or fails.** The Google Sheets it replaces did not fail because spreadsheets are bad — they failed because nothing pulled the team back to them. An app nobody opens fails identically. Notifications are load-bearing, not polish.

Locked decision: web push only. No WhatsApp, no email digests.

---

## Step 1 — Push infrastructure

### What to do

Register a service worker handling `push` and `notificationclick`. Build the subscription flow: prompt at a sensible moment rather than on first load, store the subscription in `push_subscriptions`, and handle permission denied without breaking the app.

Create `lib/push/send.ts` sending to all of a user's subscriptions, pruning any that return 410 Gone. Clicking a notification opens the relevant deep link and focuses an existing tab rather than opening a duplicate.

### Checkpoint 1

- [ ] The service worker registers and appears in browser dev tools
- [ ] Subscribing stores endpoint, p256dh and auth keys in `push_subscriptions`
- [ ] A test push arrives on desktop Chrome and on Android
- [ ] Clicking a notification opens its deep link and focuses an existing tab
- [ ] Denying permission leaves the app fully usable with in-app notifications only
- [ ] A dead subscription returning 410 is deleted automatically
- [ ] One user with two devices receives the notification on both

---

## Step 2 — Event notifications

### What to do

Fire notifications on the transitions that need a human, each to the right person:

| Event | Goes to |
|---|---|
| Shoot scheduled or rescheduled | Assigned cameraman |
| Raw footage arrived | Brand manager and assigned editor |
| Edit assigned | Assigned editor |
| Cut submitted | Brand manager |
| Changes requested | Assigned editor |
| Client approved or requested changes | Brand manager |
| Post due today | Brand manager |
| Client link viewed | Brand manager |

Never notify someone about their own action. Batch bursts so approving eight items produces one notification, not eight. Write every notification to the `notifications` table whether or not push delivery succeeds.

### Checkpoint 2

- [ ] Each of the eight events fires to the correct recipient and nobody else
- [ ] Performing an action yourself produces no notification to yourself
- [ ] Approving eight items in a minute yields one batched notification
- [ ] Every notification persists to `notifications` even with push disabled
- [ ] Notification text names the client and the idea, not a bare id
- [ ] A cameraman receives nothing about edits; an editor receives nothing about posting

---

## Step 3 — Notification centre

### What to do

Wire the TopNav bell: unread count badge, dropdown of recent notifications grouped by day, each deep-linking to its subject. Mark read on click, with a mark-all-read action. Unread state syncs across tabs.

### Checkpoint 3

- [ ] The badge shows the true unread count and clears correctly
- [ ] The dropdown lists recent notifications newest first, grouped by day
- [ ] Clicking one marks it read and navigates to the right record
- [ ] Mark all read clears the badge
- [ ] Opening in a second tab reflects the same unread state
- [ ] A user with no notifications sees an empty state

---

## Step 4 — Staleness alerts

### What to do

Build `/api/cron/staleness`, authenticated by `CRON_SECRET`, running hourly via `pg_cron`. Flag and notify on:

- A shoot past its end time with no raw detected for 24 hours → cameraman and brand manager
- An edit past its deadline → editor and brand manager
- A cut at `cut_submitted` for over 12 hours → brand manager
- An item at `with_client` for over 48 hours → brand manager
- A post past its scheduled time and unposted → brand manager
- Drive storage above 70% and above 85% of the pool → admin
- An upload session stalled with no progress for over 24 hours → cameraman and brand manager

Alert once per item per threshold, not every hour. Escalate to the admin if a brand manager alert is unactioned for 48 hours.

### Checkpoint 4

- [ ] Each of the six conditions is detected against deliberately seeded stale data
- [ ] Each alert fires exactly once per item per threshold, verified by running the job three times
- [ ] Resolving the condition and re-triggering it allows a fresh alert
- [ ] Escalation to admin fires after 48 unactioned hours
- [ ] `pg_cron` runs hourly, confirmed in the run history
- [ ] Calling the endpoint without `CRON_SECRET` returns 401
- [ ] The job completes in under 30 seconds on the seeded dataset

---

## Step 5 — Preferences

### What to do

Give each user simple notification preferences in settings: per-category toggles and a quiet-hours window during which push is suppressed but in-app notifications still accumulate.

Keep it deliberately simple — a complex preferences screen is how people end up turning everything off.

### Checkpoint 5

- [ ] Disabling a category stops its push while still writing to `notifications`
- [ ] Quiet hours suppress push and deliver nothing retroactively on exit
- [ ] Preferences persist per user and survive sign-out
- [ ] Defaults are sensible — everything on, quiet hours 10pm to 8am IST

---

## Self-Audit Instruction

Before declaring this phase complete, you must:

1. Re-read every checkpoint in this phase file
2. Test each one for real — trigger actual pushes on an actual phone. Notification delivery cannot be verified by reading code.
3. Return a structured report:
   ✅ [Checkpoint] — Pass
   ⚠️ [Checkpoint] — Partial: [specific reason]
   ❌ [Checkpoint] — Fail: [specific reason]
4. Fix all failures and partials before reporting phase complete.
5. Only say "Phase 8 Complete" when every checkbox is green.
6. Update `docs/progress.md` with what was built, deviations, and anything carried into Phase 9.

## Final Phase 8 Checklist

- [ ] Push working on desktop and mobile with graceful permission handling
- [ ] Eight event notifications routed to the correct people, batched, never self-notifying
- [ ] Notification centre live with accurate unread state
- [ ] Six staleness conditions detected hourly, alerting once per threshold with escalation
- [ ] Preferences and quiet hours working
- [ ] Self-audit passed with all green
- [ ] `docs/progress.md` updated
