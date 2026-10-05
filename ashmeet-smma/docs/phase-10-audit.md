# Phase 10 hardening and launch audit

Status: all buildable parts are done and checked from code. Steps that need real devices, real people or a deployed URL are listed under "Needs people and devices" and cannot be completed from a desk. Phase 10 is therefore **not** declared complete under its all-green rule.

## Built

**PWA.** `manifest` (name, theme `#6C5CE7`, standalone, 192/512 icons incl. maskable, Apple touch icon), service worker (static assets cache-first, cameraman pages kept for offline, offline fallback page, versioned caches deleted on activate, `skipWaiting` and `clients.claim`, `sw.js` served no-cache so a deployment replaces it without clearing caches, user caches wiped on sign-out). Install prompt from the third visit, dismissible for good, with iPhone "Add to Home Screen" guidance.

**Offline cameraman.** Schedule (times, clients, locations, concept, script, references) cached per user on every successful load and shown when offline with a "saved schedule from" note; "mark raw uploaded" queues visibly ("Queued, will sync") in localStorage, survives a restart, syncs on reconnect, drops an entry the server can never accept; upload is disabled with "Needs a connection" while offline. Unit tests cover the cache, queue, restart and sync.

**Storage.** Admin Settings now shows live storage in place of the fixed "1.64 TB" meter: Drive pool use against 2 TB, breakdown by client then shoot (largest first, sums to the total), B2 cuts and library separately, 70%/85% banners (and alerts through Phase 8), shoots eligible for deletion (every idea posted over 30 days ago), unfinished uploads, and a "Compare with Drive" check against Drive's own file sizes. Deletion is admin only, needs a typed phrase naming the count, is capped at 10 shoots per request (no delete-all), re-checks eligibility on the server, removes the Drive folder (trashes it if the service account may not delete), clears `raw_files` and logs actor and freed bytes. Brand managers get a read-only `/manager/storage`.

**Errors and instrumentation.** Error boundaries for every route group, root, global and the client approval page; loading states on every group; 404 page. Sentry (`@sentry/nextjs`) is inert until a DSN is set; every event and breadcrumb passes `scrubEvent`, which removes magic-link tokens, PINs, auth headers, cookies, request bodies, signed URLs and keys (tested by feeding it each). Source maps upload only when `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT` are set. Retry with backoff (`lib/retry.ts`) wraps Drive folder, Drive deletion and B2 head/delete/multipart calls; a simulated timeout retries four times then names the failed service. Dev scratch pages return 404 in production.

**Security and performance.**
- `scripts/audit-api-routes.mjs`: 56 route files, 0 unprotected, 0 session routes without an access check. Three routes that did manual checks (`media/play`, `editor-assign`, `upload/active`) and the library helper now go through `canAccess()`.
- `scripts/audit-client-bundle.mjs`: scanned the built client bundle for 18 secret patterns (service-role key, B2 key, private key, encryption key, cron secret, VAPID private key and others, plus `session_uri_enc`): none found.
- Isolation suite (`tests/isolation.test.ts`) passes against the live database with all new tables. Full suite: 66 of 66 pass.
- Migration `012_phase10_indexes.sql` applied. `scripts/measure-queries.mjs`: the heaviest list queries run in 38 to 87 ms round trip; the analytics activity query executes in 0.1 ms.
- Approval tokens are 32 random bytes stored as SHA-256; PINs are salted scrypt with a five-failure lock (Phase 6).

## Needs people and devices (not done)

1. Install on Android Chrome and iOS Safari; Lighthouse PWA audit; repeat-visit cache check in the Network tab; deploy-then-update check of the service worker.
2. Offline with airplane mode on a real phone, including a queued mark surviving an app restart.
3. Storage figure within a small margin of Drive (press "Compare with Drive"); a real deletion on a real eligible shoot; the 70%/85% alerts firing.
4. Forced API failure and a forced error on the approval page with a real Sentry DSN, to confirm source maps resolve and no secret appears.
5. Lighthouse performance above 85 for one route per role, and every list screen under 2 seconds in a browser.
6. Step 6, migration and go-live: loading real clients, scope, team and the month's plan; team sign-ins; Drive folders and editor access; observed sessions per role; a real shoot-to-upload cycle with an interrupted resume. See `docs/go-live-runbook.md`.

## Deviations

- Offline caching covers the cameraman's pages; other roles fall back to the offline page. Pages are cached per browser and wiped on sign-out.
- Raw footage is deleted from Drive by trashing the folder when the service account lacks permanent-delete rights (it has `canTrash` but not `canDelete`).
- Sentry and the PWA install behaviour are configured but inert/untested until a DSN and a deployed HTTPS origin exist.
