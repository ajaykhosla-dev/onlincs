# Phases 8 and 9 audit

Status: development complete, migration `011` applied live. Real-device and browser verification are outstanding.

## Phase 8: notifications

**Built.** Notifications are written by database triggers on `activity_log`, so every path that changes state produces them. Push delivery runs afterwards in the app.
- Service worker (`public/sw.js`): push, notification click (focuses an open tab instead of opening a duplicate), versioned caches.
- Subscribe flow: prompt only from the second visit, dismissible, denial handled; `/account/notifications` for per-device on/off, a test push, category toggles and quiet hours (default 10pm to 8am IST).
- `lib/push/send.ts`: sends to every device, deletes subscriptions that return 404/410, claims each notification before sending so overlapping runs never double-send.
- Eight events routed (shoot, raw arrived, edit assigned, cut submitted, changes requested, client response, post due today, client link viewed). Self-notifications are dropped; bursts in 60 seconds fold into one row; every notification persists whether or not push succeeds. Text names the client and the idea.
- Bell in the TopNav (all four roles): true unread count, grouped by day, mark read on click, mark all read, synced across tabs (BroadcastChannel plus polling).
- Staleness: `phase8_run_staleness()` plus `/api/cron/staleness` (Bearer `CRON_SECRET`, 401 otherwise). Seven conditions (shoot with no raw 24h, edit past deadline, cut waiting 12h, client waiting 48h, post overdue, Drive 70%/85%, upload stalled 24h) plus "post due today". One alert per item per threshold; resolved conditions are forgotten so they can alert again; admin escalation after 48 hours.

**Verified (rollback-only on live DB, `scripts/verify-phase8-migration.mjs`).** Each event reaches only its recipient; self-notify dropped; eight approvals become one row with `batch_count` 8; seven conditions detected, three runs alert once, resolve then re-trigger alerts again, escalation fires once, job under 30s. Unit tests cover preferences and quiet hours. Isolation suite passes with the new tables.

**Not verified.** Real push on desktop Chrome and Android, two devices at once, a 410 prune against a real push service, permission-denied in a real browser. The hourly `pg_cron` job is not scheduled because the app has no public URL yet: run `scripts/schedule-staleness-cron.mjs <https-url> --apply` after deploy.

**Deviations.** Notification rows are batched by type per recipient within 60 seconds (so a stale-item burst also folds into one row, with the count kept). Preferences live at `/account/notifications` rather than inside role settings pages. The seven staleness conditions in the spec text are listed as "six".

## Phase 9: analytics

**Built.** `lib/analytics/compute.ts` (pure) and `index.ts` (queries, 15-minute cache, paginated reads). Medians, not means; empty data returns 0. Team screen grouped by role, sortable, month selector, member slide-over (activity, clients, open work). Scope of work with pace flags and a six-month trend, for admin (`/admin/scope`) and manager (own clients). Clickable metric cards on both Clients screens and the Posting screen whose numbers are the lengths of the lists they open. CSV export of the current view (role-scoped, formula-injection safe, BOM, logged) and a per-client monthly report. Rail badges are now live counts instead of fixed numbers.

**Verified.** `npm run verify:analytics` compared 42 values (delivered per client, per-editor cuts and turnaround medians, per-manager posted and turnaround medians, client turnaround, on-time, first-pass, revision rate) against independently written SQL for September and October: all match; compute under 500ms. Unit tests cover the outlier-resistance of the median, filters, zero-activity members, pace flags and CSV safety.

**Not verified / deviations.**
- The seeded activity trail is thin (10 delivered in September, no raw-to-cut pairs), so the spec's example numbers (Sandhu 6/16, Grover 20/20) cannot come from this seed. The rules are tested with synthetic data; with the seed Sandhu shows 0 of 16 behind pace, Verdant onboarding.
- The three Team-screen headline cards (medians and rates) are not clickable; they are not counts of rows.
- Export to Excel was not opened in Excel itself (CSV format is tested).
- Drill-through and refresh were not exercised in a browser.
