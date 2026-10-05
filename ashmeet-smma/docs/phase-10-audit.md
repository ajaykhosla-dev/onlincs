# Phase 10 hardening and launch audit

Status: all buildable parts are done and checked from code. Steps that need real devices, real people or a deployed URL are listed under "Needs people and devices" and cannot be completed from a desk. Phase 10 is therefore **not** declared complete under its all-green rule.

Live recheck (5 Oct 2026): PWA manifest and service worker served, admin storage and delete-confirmation guard responded correctly, API route audit found 64 protected routes, client bundle scan found no listed secrets, the full suite passed 81/81, and the slowest measured query round trip was 43.1 ms. Headless Edge at 390px loaded a cameraman's saved schedule while offline, disabled upload, queued a raw mark, and kept it across reload. The temporary identity and shoot assignments were removed. See `scripts/qa-phase8-11-http.mjs` and `scripts/qa-phase10-offline-browser.mjs`.

**Storage reconciliation currently fails on seed data.** The live comparison returned 8,820,572,389 recorded bytes versus 230,637,797 bytes reported by Drive (3,724.4% difference). `scripts/inspect-phase10-storage.mjs` identified three seeded `raw_files` rows (`rf-1`–`rf-3`) with placeholder Drive IDs and 8,589,934,592 bytes between them. The other two real raw-file rows total exactly 230,637,797 bytes. The calculation works on real files; remove or replace the placeholder seed rows before treating the storage meter as a real usage figure. No live seed rows were deleted during verification.

## Built

**PWA.** `manifest` (name, theme `#6C5CE7`, standalone, 192/512 icons incl. maskable, Apple touch icon), service worker (static assets cache-first, cameraman pages kept for offline, offline fallback page, versioned caches deleted on activate, `skipWaiting` and `clients.claim`, `sw.js` served no-cache so a deployment replaces it without clearing caches, user caches wiped on sign-out). Install prompt from the third visit, dismissible for good, with iPhone "Add to Home Screen" guidance.

**Offline cameraman.** Schedule (times, clients, locations, concept, script, references) cached per user on every successful load and shown when offline with a "saved schedule from" note; "mark raw uploaded" queues visibly ("Queued, will sync") in localStorage, survives a restart, syncs on reconnect, drops an entry the server can never accept; upload is disabled with "Needs a connection" while offline. Unit tests cover the cache, queue, restart and sync.

**Storage.** Admin Settings now shows live storage in place of the fixed "1.64 TB" meter: Drive pool use against 2 TB, breakdown by client then shoot (largest first, sums to the total), B2 cuts and library separately, 70%/85% banners (and alerts through Phase 8), shoots eligible for deletion (every idea posted over 30 days ago), unfinished uploads, and a "Compare with Drive" check against Drive's own file sizes. Deletion is admin only, needs a typed phrase naming the count, is capped at 10 shoots per request (no delete-all), re-checks eligibility on the server, removes the Drive folder (trashes it if the service account may not delete), clears `raw_files` and logs actor and freed bytes. Brand managers get a read-only `/manager/storage`.

**Errors and instrumentation.** Error boundaries for every route group, root, global and the client approval page; loading states on every group; 404 page. Sentry (`@sentry/nextjs`) is inert until a DSN is set; every event and breadcrumb passes `scrubEvent`, which removes magic-link tokens, PINs, auth headers, cookies, request bodies, signed URLs and keys (tested by feeding it each). Source maps upload only when `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT` are set. Retry with backoff (`lib/retry.ts`) wraps Drive folder, Drive deletion and B2 head/delete/multipart calls; a simulated timeout retries four times then names the failed service. Dev scratch pages return 404 in production.

**Security and performance.**
- `scripts/audit-api-routes.mjs`: 64 route files, 0 unprotected, 0 session routes without an access check. Three routes that did manual checks (`media/play`, `editor-assign`, `upload/active`) and the library helper now go through `canAccess()`.
- `scripts/audit-client-bundle.mjs`: scanned 60 built client files for 14 secret patterns (service-role key, B2 key, private key, encryption key, cron secret, VAPID private key and others, plus `session_uri_enc`): none found.
- Isolation suite (`tests/isolation.test.ts`) passes against the live database with all new tables. Full suite: 81 of 81 pass.
- Migration `012_phase10_indexes.sql` applied. `scripts/measure-queries.mjs`: the slowest list query ran in 43.1 ms round trip; the analytics activity query executed in 0.106 ms.
- Approval tokens are 32 random bytes stored as SHA-256; PINs are salted scrypt with a five-failure lock (Phase 6).

## Needs people and devices (not done)

1. Install on Android Chrome and iOS Safari; Lighthouse PWA audit; repeat-visit cache check in the Network tab; deploy-then-update check of the service worker.
2. Offline with airplane mode on a real phone, including a queued mark surviving an app restart and syncing on reconnection. The Edge offline/reload case passed.
3. Reconcile or remove the three placeholder raw-file rows before expecting a small Drive variance; test a real deletion on an eligible shoot and the 70%/85% alerts.
4. Forced API failure and a forced error on the approval page with a real Sentry DSN, to confirm source maps resolve and no secret appears.
5. Lighthouse performance above 85 for one route per role, and every list screen under 2 seconds in a browser.
6. Step 6, migration and go-live: loading real clients, scope, team and the month's plan; team sign-ins; Drive folders and editor access; observed sessions per role; a real shoot-to-upload cycle with an interrupted resume. See `docs/go-live-runbook.md`.

## Deviations

- Offline caching covers the cameraman's pages; other roles fall back to the offline page. Pages are cached per browser and wiped on sign-out.
- Raw footage is deleted from Drive by trashing the folder when the service account lacks permanent-delete rights (it has `canTrash` but not `canDelete`).
- Sentry and the PWA install behaviour are configured but inert/untested until a DSN and a deployed HTTPS origin exist.
