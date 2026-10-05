# progress.md — Build state

> **Read this first in every session.** It is the only handoff between Claude Code sessions.
> Update it whenever a phase completes, and whenever a session ends mid-phase.

**Last updated:** 5 October 2026
**Updated by:** Claude Code (Phases 6 to 10 development)
**Current phase:** All eleven phases are now developed. Migrations 009 to 013 applied live. Verification, deployment and go-live are what remain (see `ashmeet-smma/docs/` audits and `go-live-runbook.md`); Phase 5 and Phase 4 verification remain open
**Next action:** Create the platform owner (`scripts/create-platform-owner.mjs`), walk the console, then run the checkpoints in `docs/phase-11-audit.md`. Then run the checkpoints in `docs/phase-6-audit.md`, `phase-7-audit.md`, `phase-8-9-audit.md`, `phase-10-audit.md`; follow `docs/go-live-runbook.md`. Earlier: run the Phase 6 checkpoints (see `ashmeet-smma/docs/phase-6-audit.md`), set `TRANSCRIPTION_API_KEY`, then run the Phase 6 checkpoints on a real phone and microphone. Also run Phase 5 real-browser 120MB cut upload, editor-role, playback/seek, version, and library checkpoints. Phase 4 browser checks remain deferred. Phase 1 still needs client sign-off, and Phase 0 owner decisions remain open. See `ashmeet-smma/docs/phase-5-audit.md`.

---

## Phase status

| Phase | Name | Status | Completed |
|---|---|---|---|
| 0 | Foundation — schema, RLS, seed, env, external service verification | ⚠️ Verified live; awaiting owner decisions (see 3 Oct entries) | — |
| 1 | UI conversion — port approved HTML into Next.js components, pixel-identical, static data | ⚠️ Complete with known issues — awaiting client sign-off on the running app | 3 Oct 2026 |
| 2 | Auth, roles, shell — Google OAuth, session, role routing, permission matrix | 🟡 In progress | — |
| 3 | Clients + Content Planner — the pipeline spine | 🟡 In progress | — |
| 4 | Shoots + Raw Upload — scheduling, Drive folders, the upload wrapper | 🟡 In progress | — |
| 5 | Editor pipeline + media — queues, B2 upload, versions, player | 🟡 In progress | — |
| 6 | Review + approval — comments, voice notes, magic links | 🟡 Development complete; migration applied, verification pending | — |
| 7 | Posting schedule — grid, captions, downloads, mark posted | 🟡 Development complete; migration applied, verification pending | — |
| 8 | Notifications — web push, cron staleness alerts | 🟡 Development complete; migration applied; real-device push and cron scheduling pending | — |
| 9 | Owner analytics — SoW vs delivered, team performance | 🟡 Development complete; metrics verified against SQL; browser checks pending | — |
| 10 | Hardening + launch — PWA, offline, storage view, migration | 🟡 Buildable parts done; real-device and go-live steps pending | — |
| 11 | RapidArc platform console — tenant onboarding | 🟡 Development complete; migration applied; console not yet used by a person | — |

Status values: ⬜ Not started · 🟡 In progress · ✅ Complete · ⚠️ Complete with known issues

---

## Session log

Newest entries at the top. One entry per session.

### 5 Oct 2026 — Phases 6 to 11 automated testing
**Phase:** 6 to 11 (automated verification; human and device checks still pending)
**Done:** One test-and-fix agent per phase (6, 7, 8–9, 10, 11) ran the audit checkpoints that need no login or device, reviewed the code and probed the dev server unauthenticated. Six fixes, all in commit `b49cfa6`: B2 no longer falls back to the environment bucket for any agency except the original workspace (`lib/integrations/credentials.ts`); support-cookie signing refuses a missing or short `CREDENTIAL_ENCRYPTION_KEY` (`lib/platform/signed.ts`); the offline mark queue keeps marks on 401, runs one flush at a time and no longer overwrites marks queued mid-flush (`lib/offline/store.ts`, new test); the service worker no longer caches redirected navigations (`public/sw.js`, cache `v2`); Sentry scrubbing removes email addresses; `GET /api/posting` defaults to the IST month. Afterwards: typecheck and lint clean, 81 of 81 tests (isolation needs `--env-file=.env.local`), `verify:tenants` 30 of 30, route audit 64 routes none unprotected.
**Not done:** Anything needing a signed-in session, a real device, real B2 cuts, a second agency's real accounts, emails, Lighthouse, a Sentry DSN or a production build.
**Deviations:** Northside (`ag-2`) has no own B2 credentials, so its B2 operations now error until they are entered. For the original workspace, enter B2 credentials before or with its own Drive credentials, or the environment B2 fallback stops matching.
**Carried forward:** Owner decisions: retry failed push sends, and whether quiet-hours pushes should be delivered later rather than dropped. `TRANSCRIPTION_API_KEY` is still unset.

### 5 Oct 2026 — Phase 11 development
**Phase:** 11 (development complete; verification pending)
**Done:** Migration `013_phase11_platform.sql` applied (agency profile and lifecycle columns, credential fingerprints, support sessions, transactional onboarding and suspension functions). `/platform` console (separate dark plane, platform owner only, two-factor enforced on every page and API route): agency list with usage, onboarding with admin invite, details and branding (display name and logo appear only in that agency), write-only encrypted per-agency Drive and B2 credentials with a forgiving key parser and a per-step connection test, view-as-agency support sessions (reason required, read-only, non-dismissible banner on every workspace screen, 15-minute logged elevation, entry and exit with duration visible to the agency admin), suspension and reactivation (blocks sign-in everywhere, destroys nothing), usage, and a complete JSON export with media manifest. Drive provisioning, uploads, sync, storage deletion and B2 signing now use each agency's own credentials. 30 live multi-tenant assertions, a rollback-only SQL check, 4 new isolation tests (20 of 20), credential and support-session unit tests; full suite 80 of 80, route audit 64 routes none unprotected, client bundle clean. Details: `ashmeet-smma/docs/phase-11-audit.md`.
**Not done:** No platform owner exists yet; the console has not been walked through by a person. Real second-agency Drive and B2 accounts, the invitation email, suspension and support banner in a browser. The deliberate-RLS-break mutation check was not repeated on the live database.
**Deviations:** Logo is an https link. The original Ashmeet workspace keeps using environment credentials until its own are entered. Support sessions render as that agency's admin.
**Carried forward:** Create the platform owner, then verify with two real agencies. This completes the planned build; outstanding work is verification, deployment, the production Supabase project, secret rotation and the go-live runbook.

### 5 Oct 2026 — Phases 8, 9 and 10 development
**Phase:** 8, 9, 10 (development complete except go-live)
**Done:** Migrations `011` (notifications, push bookkeeping, preferences, alert state, activity and notification triggers, staleness functions) and `012` (indexes) applied live after rollback checks. Phase 8: service worker, push send and prune, subscribe prompt, bell, preferences and quiet hours, eight event notifications, staleness job and `/api/cron/staleness`. Phase 9: analytics layer (verified against 42 independent SQL comparisons), Team and Scope screens, clickable metric cards, role-scoped CSV export and client report, live rail badges. Phase 10: PWA (manifest, icons, install prompt), cameraman offline cache and queued sync, storage view with typed-confirmation deletion, error boundaries, Sentry with scrubbing (inert without a DSN), retry with backoff, route audit (56 routes, none unprotected; three routes moved onto `canAccess`), client-bundle secret scan (clean), query timings (all under 90 ms), dev pages 404 in production. 66 of 66 tests pass including the isolation suite on the live database. Details: `ashmeet-smma/docs/phase-8-9-audit.md`, `phase-10-audit.md`, `go-live-runbook.md`.
**Not done:** Real-device push, install on Android and iOS, offline in airplane mode, Lighthouse, a real Drive deletion, Sentry with a real DSN, pg_cron scheduling (needs the deployed URL), and Phase 10 step 6 (real data, team onboarding, observed sessions, parallel period). Phase 11 not started.
**Deviations:** New dependencies `web-push` and `@sentry/nextjs`. Seed data is too thin to reproduce the spec's example SoW numbers. Raw deletion trashes the Drive folder because the service account lacks permanent-delete rights. A separate production Supabase project is still required before launch.
**Carried forward:** Approval to begin Phase 11. Per-agency Drive credentials need a refactor of `lib/drive/auth.ts` (currently one global service account).

### 5 Oct 2026 — Phase 7 development
**Phase:** 7 (development complete; verification pending)
**Done:** Migration `010_phase7_posting.sql` (one post per item; transactional schedule, edit, mark-posted and 24-hour undo functions, service-role only). Live `/admin/posting` and `/manager/posting` (month grid, chronological day panel with full captions, text-labelled posted/upcoming/overdue, role-scoped); scheduling from `client_approved` with a multi-line caption and count, music reference, IST entry and UTC storage, dismissible same-client-within-an-hour warning; editing before posting; presigned download of the latest client-approved cut as `client-idea-name-vN.mp4`, logged; mark posted (past dates allowed) and undo within 24 hours, logged; overdue/today/this-week lists with empty states; overdue count on the posting screen and an admin Clients metric card. The generic status route and planner dropdown no longer offer `scheduled` or `posted`. TypeScript, lint, production build and four new format tests pass; `scripts/verify-phase7-migration.mjs` passed rollback-only against the live database.
**Not done:** Migration not applied. No browser, role-session, real download (needs a real B2 cut), mobile Safari/Chrome or hand-run SQL scope comparison yet. See `ashmeet-smma/docs/phase-7-audit.md`.
**Deviations:** Scope delivered still counts by the item's planned month. `posted_at` is the marking time. Admin metric card sits on the Clients page; Team page cards stay Phase 9 fixtures.
**Carried forward:** Apply the migration, run the Phase 7 checkpoints, then the Phase 6 ones. Phase 8 notifications could alert on overdue posts.

### 5 Oct 2026 — Phase 6 development
**Phase:** 6 (development complete; verification by the other developer)
**Done:** Migration `009_phase6_review.sql` (comment transcript status and edit time; link attempt counter and lock; `approval_link_views`; service-role-only review, reopen, link create/revoke, PIN attempt, view and client-respond functions; `phase5_complete_cut` now accepts resubmission from `changes_requested` and `client_changes`). Timestamped comments bound to a version with edit/delete by author, resolve and filters; in-browser voice notes (2-minute cap, presigned B2 upload, separate transcription step with Retry); internal Approve / Send changes in Editors' den; magic links (32-byte token and 4-digit PIN, hashes only, 7-day expiry, one version, regenerate/revoke, shown once); public mobile-first `/approve/[token]` with PIN, five-failure lock, distinct failure states, view logging and Approve / Request changes; verbatim client text, manager notification card, reopen from `client_approved`; editor Re-do now shows the latest cut with all comments, voice notes and client text. TypeScript, lint, production build and three new token/session unit tests pass; public routes smoke-tested for invalid-token and signed-out responses. Details and the checkpoint map are in `ashmeet-smma/docs/phase-6-audit.md`.
**Migration update:** Owner approved; `scripts/verify-phase6-migration.mjs` (rollback-only) passed, then `009` was committed in one transaction. Read-only check confirmed the seven `phase6_*` functions, the four new columns and `approval_link_views`; existing counts unchanged (8 comments, 5 links).
**Not done:** The app's Phase 6 screens and routes have not been exercised against the live database. No transcription key is set. All six checkpoints, a real phone, a real microphone and B2 voice-note CORS for the production origin are untested. `isolation.test.ts` still needs `TEST_DATABASE_URL`.
**Deviations:** Transcription uses any OpenAI-compatible endpoint (default `whisper-1`; no new dependency). In-app notification is an "Updates" card in Editors' den, not the bell (Phase 8). The planner status control and generic status route no longer offer review-owned states. A client's later change after approval is relayed by the manager through Reopen; the link accepts one response.
**Carried forward:** Apply migration; run the rollback check, then the full Phase 6 self-audit; optionally `scripts/seed-phase6-links.mjs --apply` to open the seeded expired/revoked/responded links; add the production origin to the B2 CORS rule before launch; Phase 8 should replace the Updates card with the bell and push.

### 4 Oct 2026 — Phase 5 implementation prepared
**Phase:** 5 (in progress)
**Done:** Replaced fixture den, editor queues, and library with live scoped data. Added transactional assignment/reassignment, editor load, direct multipart B2 cut/library upload with retry and cancellation, per-item version completion, status syncing to the latest version, authorized presigned playback, faststart warning, and live library folders. New `008_phase5_editor_media.sql` passed a rollback-only live transaction covering authorization, assignment, two version increments, replay, latest status, and library completion. Temporary B2 multipart/list/abort and ranged-GET checks passed; TypeScript, targeted lint, production build, and 32 existing tests passed. Details in `ashmeet-smma/docs/phase-5-audit.md`.
**Not done:** Live migration and B2 PUT CORS update are not applied. A signed browser PUT preflight returned 403 because the existing localhost CORS rule only allows GET/HEAD. Real 120MB browser upload, seeking, editor role, and library upload/download checks remain.
**Deviations:** The B2 CORS rule is prepared by a dry-run-first script that preserves the existing GET/HEAD settings. The existing anonymous isolation test was corrected to accept either a permission error or zero rows under RLS.
**Carried forward:** Apply the reviewed live migration and CORS rule, then test each Phase 5 checkpoint with real video and editor sessions. Keep Phase 4 unfinished browser checks in its audit.

**Live setup update:** Ashmeet approved both changes. `008_phase5_editor_media.sql` committed in one transaction; a read-only check confirmed RLS, service-role-only RPC grants, and zero active media sessions. B2 rejected an S3 API CORS update because the existing rules were created through the Native API. The same scoped change was applied through B2 Native API, preserving the existing rules. Localhost signed PUT preflight, including `Content-Type`, then passed; two-part upload, range 206, and abort were rerun successfully. Real browser/media checkpoints remain.

### 4 Oct 2026 — Phase 4 live verification continued
**Phase:** 4 (development complete; verification in progress)
**Done:** Authenticated cron rejected an unauthenticated call, provisioned five Ashmeet-agency seeded shoots, detected a direct Drive drop, advanced its cursor, and did not duplicate a wrapper-uploaded file. A separate direct-drop test transitioned an eligible shoot/idea to raw uploaded and notified its manager and assigned editor. Temporary invited manager/editor identities passed their live page and role-scoped API checks. A temporary cameraman account rendered the real shoot and seeded pending pages at 390px in headless Edge without horizontal overflow. All temporary identities, assignments, database test records, and Drive test files were cleaned up. Details are in `ashmeet-smma/docs/phase-4-audit.md`.
**Not done:** Real-browser multi-gigabyte and eight-file/three-idea uploads, tab-close resume, different-size rejection, network-drop recovery, expired-session handling, Google PUT header inspection, touch interaction, and a real editor opening Drive links.
**Deviations:** Neither active editor appeared as a direct Shared Drive member in the Drive permissions API. Group or inherited access remains unknown.
**Carried forward:** Finish the remaining browser matrix and verify or provide editor Shared Drive read access before marking Phase 4 complete. The admin upload test page remains until those checks are finished.

### 4 Oct 2026 — Phase 4 implementation prepared
**Phase:** 4 (in progress)
**Done:** Built transactional shoot scheduling and many-to-many links; scoped shoot APIs; durable Drive folder provisioning with retry; the sequential direct-to-Google upload queue with resume; live cameraman, admin, and manager calendars; an editor raw-file view; raw arrival and notifications; hourly Drive changes backstop; and admin reconciliation. `006_phase4_shoots.sql` passed a rollback-only live Supabase test for scheduling, cross-manager denial, update/cancel, shared item, and arrival. TypeScript and targeted lint pass. Details are in `ashmeet-smma/docs/phase-4-audit.md`.
**Not done:** Real browser role and Drive tests, especially multi-gigabyte upload and next-day resume, remain. Hourly production cron needs Vercel Pro or an external scheduler; Hobby permits only daily runs.
**Deviations:** The app's upload page returns the decrypted session URI only to the authorized uploader, as required for direct browser PUT; `session_uri_enc` never appears in a response. Seeded Drive sync page tokens were placeholders and are cleared by the migration.
**Carried forward:** Test the complete Phase 4 checkpoint matrix and mark complete only when all checks are green. Editors require Shared Drive read access; cameramen require none.

**Migration update:** Ashmeet approved `006_phase4_shoots.sql`; Codex applied it in one transaction. A read-only live check verified six functions, the folder job table, the upload progress column, zero placeholder sync cursors, and unchanged existing shoot/link counts (7/11). Existing seeded idea folder IDs are placeholders; the folder worker replaces them during provisioning.

**Browser update:** Ashmeet confirmed the live admin calendar, shoot scheduling, and folder provisioning work. A read-only database check found the newly scheduled "Title of Naruto" shoot with one linked idea, a complete folder job, a stored shoot folder ID, and one stored idea subfolder ID. Counts rose from 7/11 to 8/12 shoots/links. Drive UI, cameraman upload/resume, manager/editor roles, and the cron remain to be tested.
**Drive update:** A read-only Drive API check found both new folders in the configured Shared Drive and confirmed the idea folder is a child of the shoot folder with the expected idea slug. Cameraman upload/resume, manager/editor roles, and the cron remain to be tested.
**Edit update:** Ashmeet confirmed browser editing works. A read-only Drive API check verified the shoot's new title in the full path `Khanna Jewellers / 2026-10 / 2026-10-22 Title of Sasuke / ci-khannajewellers-002`.
**Eligibility correction:** The live browser test exposed that a posted Khanna Jewellers idea could be selected for a new shoot. The selector now lists only calendar-approved or already shoot-scheduled ideas. `007_phase4_item_eligibility.sql` adds an insert trigger to enforce the same rule atomically; a rollback-only check accepted approved `ci-34` and rejected posted `ci-15`, then the follow-up migration was applied live. The existing test shoot link was preserved.
**Add-idea update:** Ashmeet confirmed a second idea appears. A later read-only check found two linked ideas and a completed folder job; Drive has exactly two idea subfolders under one shoot folder. The earlier one-link read occurred before the add finished. The drawer now displays the saved count and a clear add/folder result.
**Upload test access:** With no invited cameraman account available, Ashmeet requested a temporary admin test page at `/admin/upload-test`. It renders the same upload wrapper; the active-session list now permits the signed-in admin's own sessions. TypeScript, targeted lint, and production build pass. Remove the route after browser upload testing.
**Upload picker update:** Ashmeet found `Choose clips` disabled during the first admin upload test. The wrapper now requires an explicit shoot and idea choice, marks each shoot folder as ready or pending, and explains the exact condition blocking the picker. TypeScript and targeted lint pass; live clip upload is still unverified.
**First upload attempt:** Ashmeet confirmed the picker opens, but a small MP4 remained “uploading.” Read-only Supabase inspection found no new session at that point, so no bytes had reached Drive. The wrapper now shows its current upload step, fails known HTTP errors immediately, guards against a no-progress 308 loop, and times out unanswered app API requests after 45 seconds. TypeScript and targeted lint pass. Repeat the browser test and inspect the pending Network result.
**File-selection fix:** Ashmeet clarified that choosing an MP4 and pressing Open left the queue empty. The handler was reading the browser's live `FileList` in a deferred state updater after resetting the input. It now copies selected files before resetting the input. TypeScript and targeted lint pass; retry the browser queue and actual upload.
**Small-upload pass:** Ashmeet confirmed `sample-5s.mp4` reached 100% complete in `/admin/upload-test`. Read-only verification found a complete live session at 2,848,208/2,848,208 bytes, one `raw_files` row, and the real Google Drive file of the same size in the correct idea subfolder. This is one small-file pass, not the full Phase 4 self-audit: multi-gigabyte, queue, resume, role screens, cron/backstop, and reconciliation checks remain.
**Temporary cameraman QA:** At Ashmeet's request, Codex created a disposable invited Auth identity with the cameraman role. Live tests passed for assigned-shoot scoping, `/cameraman/shoots`, admin-route 403, another shoot's upload-session 403, 8 MiB partial upload, resume after a fresh sign-in from Google's byte count, 9 MiB completion, and idempotent completion replay. Verified cleanup restored Harpreet's assignment, removed the QA identity and database records, and moved the QA Drive file to Trash (service account canTrash=true, canDelete=false). A 5 GB browser upload, visual role screens, network-drop and expiry behavior, and cron/backstop remain unverified.

### 3 Oct 2026 — Phase 3 clients and planner implementation prepared
**Phase:** 3 (in progress)
**Done:** Replaced the wired clients and planner fixtures with role-scoped live APIs and interactive screens. Added client create/edit/reassign with monthly scope, content CRUD and soft archive, the status policy and transactional SQL transition, month navigation/calendar/list, and transactional monthly approval. `005_phase3.sql` passed rollback-only live-database checks covering six clients, Jaspreet's two, client and content creation, reassignment, cross-manager denial, invalid/forbidden transitions, one activity log per transition, and rollback on forced transition and bulk failures. Transition unit tests, TypeScript, lint, and production build passed. Detailed checkpoint evidence is in `ashmeet-smma/docs/phase-3-audit.md`.
**Not done:** Live browser create/edit/archive/approval and role-session checks remain. Phase 3 is not complete.
**Deviations:** The actual Phase 0 seed has three planned Verdant Gym ideas in September 2026, though Phase 3's empty-state checkpoint says Verdant has no content. The UI shows actual database records and can show an empty month.
**Carried forward:** Run live browser and role audit, reconcile the Verdant checkpoint, then close Phase 3 only if all checks pass.

**Migration and browser update:** Codex applied `005_phase3.sql` after Ashmeet approved it; Ashmeet also ran the file in Supabase SQL Editor. A read-only check after the rerun found all four functions, the new plan-status constraint, and unchanged agency seed counts (6 clients, 6 scopes, 42 content items). Ashmeet confirmed the admin clients and September planner pages both display live data. The final production build passes after the UI status-control changes.

### 3 Oct 2026 — Admin session flow passes; Phase 2 audit recorded
**Phase:** 2 (in progress)
**Done:** Ashmeet confirmed the workspace opens on the first attempt after closing and reopening Edge in the same profile. The login page now redirects already authenticated users to their workspace, and the proxy retries a persisted session before redirecting. An invalid-session request reaches `/auth/login?expired=1`. Production build, TypeScript, and lint pass. A structured self-audit is recorded in `ashmeet-smma/docs/phase-2-audit.md`.
**Not done:** No invited Google accounts are available for brand manager, editor, or cameraman real-browser sign-in. Uninvited Google OAuth, authenticated wrong-role API, real expiry, and throttled loading checks remain. Phase 2 is not complete under its all-green criterion.
**Deviations:** The seeded text user IDs remain and are linked one-to-one to Supabase Auth UUIDs; 14 active users exist, rather than the phase file's eight.
**Carried forward:** Obtain access to role test accounts or accept the remaining browser checks as pending before closing Phase 2.

### 3 Oct 2026 — Cold browser restart redirect under retest
**Phase:** 2 (in progress)
**Done:** Ashmeet reported the first protected navigation after an Edge restart went to login, but a reload of the same URL opened the workspace without another sign-in. This shows the persisted browser session survived. The proxy now retries Auth once when a Supabase session cookie is present and, if lookup still fails, lets the protected server layout make the final user check. Signed-out navigation still redirects to login. TypeScript and lint pass.
**Not done:** Await repeat browser restart test after the proxy change; other roles remain unverified.
**Deviations:** None.
**Carried forward:** Resolve cold-start navigation and complete remaining Phase 2 self-audit.

### 3 Oct 2026 — Sign-out history retest passed
**Phase:** 2 (in progress)
**Done:** Ashmeet repeated sign-out and Back after the cached-page guard change and confirmed no workspace flash. Signed-out API examples return 401; the expired-session login message renders. Production build, TypeScript, and lint pass after the change.
**Not done:** Browser restart and real sign-in/forbidden-route checks for brand manager, editor, and cameraman remain.
**Deviations:** None.
**Carried forward:** Finish the remaining Phase 2 browser matrix and self-audit.

### 3 Oct 2026 — Invite gate verified; sign-out history fix pending browser retest
**Phase:** 2 (in progress)
**Done:** A disposable public sign-up was rejected by the Before User Created hook, and Supabase created no Auth account. An admin create-user call bypassed the hook as designed; that disposable record was deleted. Read-only verification shows 14 Auth users and zero disposable accounts. Ashmeet reported a brief workspace flash when pressing Back after sign-out. Sign-out now hides the protected document before navigation and redirects a cached restore to login; protected responses also send `Cache-Control: private, no-store`. TypeScript and lint pass.
**Not done:** Await browser retest of sign-out/back. Browser restart and the other three roles remain unverified.
**Deviations:** None.
**Carried forward:** Complete remaining Phase 2 browser checks and self-audit.

### 3 Oct 2026 — JWT claims verified
**Phase:** 2 (in progress)
**Done:** Ashmeet opened the authenticated `/api/auth/check` endpoint and confirmed its verified JWT workspace claims match the current database user. The Custom Access Token hook is active. Protected route responses now carry `Cache-Control: private, no-store, max-age=0`; a signed-out route check confirmed that header and a login redirect. TypeScript passes.
**Not done:** Await clear sign-out/back result, browser restart, uninvited-account test, and other-role browser tests.
**Deviations:** None.
**Carried forward:** Complete remaining Phase 2 self-audit checks.

### 3 Oct 2026 — Admin browser checks passed
**Phase:** 2 (in progress)
**Done:** Ashmeet confirmed an admin landing path, the styled 403 page when visiting `/editor/todo`, and a persistent session after hard refresh. Added `/api/auth/check`, an authenticated diagnostic that verifies signed JWT workspace claims against the current database user without returning a token; signed-out access returns 401. TypeScript and lint pass.
**Not done:** Await authenticated claim check and sign-out/back result. Browser restart, uninvited Google account, and other roles remain unverified.
**Deviations:** None.
**Carried forward:** Complete the remaining browser checks before the Phase 2 self-audit can pass.

### 3 Oct 2026 — First Google sign-in confirmed
**Phase:** 2 (in progress)
**Done:** Ashmeet reports Google sign-in works and the workspace renders. Read-only Supabase Auth inspection confirms the invited `ashmeet@onlincs.com` record has signed in and lists Google as a provider. The redirect mismatch was fixed in Google Cloud.
**Not done:** Browser checks for exact landing path, forbidden route, hard refresh, sign-out/back, uninvited account, and the other three roles remain to be reported or tested. Public Auth settings do not expose whether hooks are enabled, though their SQL functions pass direct checks.
**Deviations:** None for this check.
**Carried forward:** Complete the Phase 2 browser matrix and self-audit before marking Phase 2 complete.

### 3 Oct 2026 — Google OAuth redirect mismatch diagnosed
**Phase:** 2 (in progress)
**Done:** Traced the running OAuth flow through Supabase to Google. The app return URL is `http://localhost:3000/auth/callback`; Google's requested redirect URI is `https://sxinatwqirjzdtlypbrh.supabase.co/auth/v1/callback`. The Google client ID matches the old NextAuth client configured in the project. No application redirect bug was found.
**Not done:** Google Cloud must list the exact Supabase callback URI under Authorized redirect URIs for that same Web application client. The first real sign-in remains blocked by Google's `redirect_uri_mismatch` response.
**Deviations:** None.
**Carried forward:** Correct the Google Cloud OAuth client, then retry login and finish the Phase 2 browser checks.

### 3 Oct 2026 — Hook setup reported
**Phase:** 2 (in progress)
**Done:** Ashmeet reported both Auth hooks created. Their Postgres functions and Auth service execution privileges pass read-only checks. The login page points to Supabase OAuth and the sign-in start route redirects to Supabase authorization. Public Auth settings confirm Google is enabled.
**Not done:** Dashboard hook enablement is not exposed by the public settings API, and no Auth account has signed in with Google yet. Await Ashmeet's first real browser sign-in, then verify route home, forbidden access, session persistence, sign-out, and the remaining role matrix.
**Deviations:** None for this check.
**Carried forward:** Confirm both hooks show Enabled in the dashboard and complete browser verification.

### 3 Oct 2026 — Live Auth identity migration applied
**Phase:** 2 (in progress)
**Done:** Applied `004_auth_identity.sql` in one transaction. Created and linked Supabase Auth identities for all 14 active invited users. Read-only verification found 14 linked, zero unlinked, zero broken email links. All 29 tests passed against the live database, including RLS tenant isolation and an Auth-link tampering check. The running app's `/auth/start` redirects to Supabase authorization; signed-out protected routes redirect to login. Production build and lint passed.
**Not done:** The Before User Created and Custom Access Token hooks must be enabled in the Supabase dashboard. Google OAuth and browser session behavior still need real-account verification.
**Deviations:** The phase file described eight seeded users, but the live database contains 14 active invited users across the two agencies.
**Carried forward:** Enable both hooks and run the browser sign-in matrix before marking Phase 2 complete.

### 3 Oct 2026 — Supabase Auth integration prepared
**Phase:** 2 (in progress)
**Done:** Google provider is enabled and Auth redirect settings were completed by Ashmeet. Replaced NextAuth with Supabase Auth PKCE routes, server-side session refresh, database-linked identity lookup, and sign-out. Added migration `004_auth_identity.sql` to link Supabase Auth UUIDs to seeded text IDs without breaking foreign keys, protect that link from client edits, enforce invited-only Auth creation through a hook, add workspace role/agency JWT claims through a hook, and update the RLS identity helper. Added a dry-run-first provisioning script for all active seeded users. Build, lint, and 13 non-database tests passed.
**Not done:** Enable the two Auth hooks in the Supabase dashboard; run real Google login, forbidden route, sign-out, browser restart, and expiry checks. Phase 2 cannot be marked complete until those checks pass.
**Deviations:** `users.id` remains a text ID because it has many seeded foreign keys. Its unique `auth_user_id` column maps one-to-one to `auth.users.id`; the literal Phase 2 `users.id = auth.users.id` checkbox is replaced by an equivalent identity-link check.
**Carried forward:** Enable the Auth hooks and complete the real-account Phase 2 self-audit.

---

### 3 Oct 2026 — Phase 2 started
**Phase:** 2 (in progress)
**Done:** Existing Google OAuth now rejects inactive or uninvited accounts. All four role layouts and the platform route check the database-backed user on the server; a Next.js proxy preserves protected return URLs; unauthorized roles reach `/403`. Rail and TopNav show the signed-in user's identity, and sign-out is available on desktop and mobile. Four example API routes demonstrate identity, role, `canAccess()`, and Zod validation. Production build, lint, route checks, API status checks, and editor sign-out browser test passed.
**Not done:** Supabase Auth migration, `auth.users` UUID linking, real OAuth testing for all four roles, session-expiry and browser-restart tests. Supabase Auth currently reports Google provider disabled. Current working OAuth remains on NextAuth until the Supabase provider and user migration are ready.
**Deviations:** Phase 2 protection was added ahead of the required Supabase Auth switch to keep the existing working login usable. Phase 0/1 have implementation and audit evidence but do not yet meet every completion checkbox.
**Carried forward:** Complete the Supabase Auth configuration/migration and finish the Phase 0/1 self-audits before marking any phase complete.

---

### 3 Oct 2026 — Phase 1 UI conversion (rebuilt)
**Phase:** 1 (complete with known issues; client sign-off on the running app is still required)
**Finding:** the earlier Phase 1 screens were an approximation, not a port (invented numbers, wrong nav, missing elements); pixel percentages had hidden that. They were replaced.
**Built:** every prototype's markup and inline CSS ported to React (HTML converted to JSX, repeated rows driven by typed fixtures); all 18 routes (admin 7, manager 5, editor 3, cameraman 2, login). 12 data-free shared primitives (Rail, TopNav, MetricCard, FilterStrip/PillSelect, DataTable, Tag, Avatar, ProgressBar, SlideOver, Modal, EmptyState, Pager) plus `/dev/components` rendering each variant. Each role's inline CSS is scoped under a root class (`r-console`, `r-editor`, `r-cam`, `r-login`) so it cannot leak across roles. Fixtures live in `src/lib/fixtures/` (console, console-screens, editor, cameraman).
**Verified (production build):** pixel difference vs the prototypes 0–0.2% on all screens at 1440 and 1024 px and on 17 of 18 at 390 px, identical page heights, zero console errors or warnings; 46 behaviour checks pass (rail/URL state and back/forward, drawers and modals close on x/Escape/backdrop with focus return, den review with voice note and transcript, planner toggle and Plan modal, manager scope has no other clients, editor export spec text, cameraman week/day grid, event positions, now-line, mini calendar, Today, empty state, 390 px sheet and tab bar); accessibility audit clean on all 18 routes; Lighthouse accessibility 100 on admin, manager, editor, cameraman and login; `npm run build`, `tsc` and `eslint` clean; no browser storage APIs; only fonts.googleapis.com contacted. Scripts are in `tests/visual/`.
**Deviations from the prototypes (need client sign-off):**
1. `theme.css` is a reconstruction. The original shared stylesheet was never committed, so parity is measured against the prototypes rendered with the reconstructed file. Dropping the original in should correct any shared styling.
2. Contrast: `--muted`, `--amber-ink`, `--pink-ink` darkened in `src/styles/a11y-contrast.css` (muted text was 2.74:1) so Lighthouse passes; deleting that import restores the original palette.
3. Cameraman at 390 px: readable UI text raised to 15px (tab bar, date strip, mini calendar, sheet labels). Time-grid micro-labels (hour labels, event captions, weekday heads) stay at the prototype's 10.5-12px because a 7-day grid cannot hold 15px; consider defaulting to Day view on mobile.
4. Planner List view: the prototype has a Calendar/List toggle but no list view; a simple list was added. The Plan modal has 8 fields as in the prototype (the phase file says nine).
5. Den review: the prototype shows one static review; each row now opens a review with its own title and only the Diwali and Root canal reviews carry seeded comments.
6. Editor to-do detail: only "New season menu" has a full brief in the prototype; the other two show the seeded concept only.
7. Offline banner reflects real `navigator.onLine` instead of the prototype's demo timer; the upload button is a no-op until Phase 4 wires the upload wrapper; Google sign-in on the login screen is live, not inert.
8. Avatar gradients for Simran, Harpreet and Vikram and the owner's email follow the prototypes and differ from the Phase 0 seed rows.
9. Fixtures: entity fields extend the Phase 0 database types; presentation-only fields (tones, gradients, display strings) are not in the schema.
10. `admin-clients.html` is a sixth prototype not named in the phase file; the admin Clients screen was built from `admin.html`.
**Not done:** client sign-off; Lighthouse was run on one route per role plus login (not every route).
**Carried into Phase 2:** auth must replace the hard-coded role chrome (layouts currently show fixed initials AC/JK/RB/HS and fixed rail badges); next-auth vs Supabase Auth still to be decided; the `/dev/*` pages must be removed or protected before launch.

### 3 Oct 2026 (final) — Phase 0 live proof
B2 bucket `onlincs-edited` (EU Central) verified: multipart upload, byte-identical GET, 206 ranged read of exactly 100 bytes, unsigned access rejected. Upload wrapper proven in a real browser: a 217 MB file uploaded straight to Google with no credentials (CORS accepted), resumed from Google's byte count after the tab was closed, completion recorded one `raw_files` row, URIs encrypted at rest. `scripts/verify-upload-logic.ts` also proved: unassigned cameraman and editor get 403, a non-owner cannot read or complete a session, the seeded expired session is reported recoverable, progress equals the bytes Google holds, expiry is 7.00 days, completion replay leaves one row. Fixed: login button looped via /api/auth/signin; double-click opened duplicate Drive sessions (7 orphans from the test remain 'active' at 0 bytes); `role ===` moved out of admin/team into `lib/auth/roles.ts`.
**Not verified:** a literal 500 MB file / ~40% interrupt (tested 217 MB, interrupted later); browser Network-tab and font checks from Checkpoint 1; `supabase db reset` (applied via `scripts/apply-migrations.cjs` instead). Next phase must clean up orphan sessions when a new one starts for the same file.

### 3 Oct 2026 (later) — live verification
Supabase project connected; migrations 001-003 plus seeds applied to it (it was empty); all 26 tests pass against it, including the isolation suite as real roles. Google service account created (org policy override needed for key creation), added to the "Ashmeet SMMA" Shared Drive as Content manager; `verify:drive` passes all steps live. Decision: the service-account key and Supabase keys were pasted in chat and the owner chose not to rotate them. Helper scripts: `scripts/apply-migrations.cjs`, `set-env.cjs`, `load-sa-key.cjs` (none print secrets).
**Still open:** B2 bucket and `verify:b2`; Step 7 browser test needs Google OAuth credentials and a seeded cameraman whose email matches a real Google account; the Supabase project is labelled PRODUCTION and now holds seed data, so create a separate production project before launch.

### 3 Oct 2026 — Phase 0 audit and repair
**Phase:** 0 (in progress)
**Done and verified locally** (throwaway Postgres 17 in Docker, 26 tests passing, `next build` and `tsc` clean):
- `canAccess()` rewritten to check ownership (it only checked role before); 6 unit tests incl. negatives.
- `003_rls.sql` rewritten. The old file used permissive catch-all policies that let every user read every client, trusted a spoofable `role` JWT claim, and "hid" `session_uri_enc` with a policy that cannot do column security. Now: identity from `users` by JWT `sub`, scoped policies, column-level grants so `session_uri_enc`, approval hashes and integration credentials are unreadable by every API role.
- `tests/isolation.test.ts` rewritten: the old one used the service role (bypasses RLS, proved nothing). New one runs as the `authenticated` role with a JWT subject. Mutation-checked: a deliberately leaky policy and a granted `session_uri_enc` column each fail it.
- Seed gap-fill (`002_seed_part4.sql`): all 14 statuses >=2, 124 activity rows over 42 days, 3 library folders per client, Northside Social data in every tenant table.
- `lib/env.ts` (Zod, `server-only`, names missing vars) + `lib/env.public.ts`; browser Supabase client previously used the **service-role key** and is now anon-only; real AES-256-GCM in `lib/crypto.ts` (session URIs were only base64); B2 helpers rewritten as real presigned S3 URLs.
- Drive wrapper rewritten and routes added (`/api/upload/session|progress|complete`): sends `Origin` + `supportsAllDrives`, idempotent completion, expiry reported as recoverable. **Written, not yet run against Google.**
- `.env.example`, `.prettierrc`, scripts (`npm test`, `verify:drive`, `verify:b2`), `.env.local` with the four generated secrets, techstack §6/§9 updated.
**Not done:** Steps 6, 7, 8 live proof (no service account / B2 bucket yet); cloud Supabase not touched; `npx supabase db reset` not run (used plain Postgres); Checkpoint 1 browser checks (fonts in Network tab, bg-violet equality) not done.
**Deviations / decisions needed:**
1. Schema uses `text` ids ('ag-1') not uuid, `users.id` is not tied to `auth.users`; `upload_sessions` has `content_item_id` (spec: `shoot_item_id`); `shoot_items` has no `agency_id`/`created_at`; some status checks differ from the spec (`clients.status` adds churned, `monthly_plans.status` has `rejected` not `changes_requested`, `agencies.status` adds trial); `client_scope` columns are `reel_count` etc. (spec: `reels`). 20 tables vs 18 in spec.
2. Spec conflict: the Delivered column (14/20/6/11/9/0 = 60 items) cannot be met by a seed of ~40 content items. SoW totals do match.
3. Code uses next-auth; techstack says Supabase Auth. Phase 2 should reconcile. The next-auth jwt callback previously hard-coded role `brand_manager` (removed; `getCurrentUser()` re-reads the users table).
4. Seed lives in `supabase/migrations/002_seed*.sql`, so it would run on production; should move to `supabase/seed.sql` before launch.
5. If 001/003 were already pushed to the cloud Supabase project, the edited 003 will not re-run there; reset that project or apply the new file by hand.
**Carried forward:** all of the above, plus the blockers below.

### 23 Sep 2026 — Pre-build setup
**Phase:** Setup (no phase started)
**Done:** Architecture deep dive completed. All decisions locked (see `context.md`). Five static HTML prototypes built and signed off by the client: `admin.html`, `brand-manager.html`, `editor.html`, `cameraman.html`, `login.html` + `theme.css`. These are **design references only** — they are not application code and sit in `ui-prototypes/`, outside the Next.js app. Project docs written.
**Not done:** No Next.js app exists yet. No backend, no schema, no components.
**Deviations:** Cameraman UI was rebuilt calendar-first after the initial list-based version was rejected.
**Carried forward:** Workspace tier needs confirming before Phase 0.

---

## Open blockers

| # | Blocker | Owner | Status |
|---|---|---|---|
| 1 | Confirm the purchased Google Workspace plan is Business Standard (₹864/user/mo) or above — Starter has no Shared Drives and a service account cannot write anywhere else | Ashmeet | 🔴 Open |
| 2 | Grant editors read access to the Shared Drive — cameramen need no Google access at all, editors do | Ashmeet | 🔴 Open |
| 3 | Create the Backblaze B2 bucket and application keys | RapidArc | ✅ Resolved — live presigned upload, ranged GET, private access, and cleanup passed on 3 Oct 2026 |
| 4 | Enable the Google provider in Supabase Auth and configure callback URLs | Ashmeet / RapidArc | ✅ Resolved by Ashmeet on 3 Oct 2026 |
| 5 | Link seeded text user IDs to `auth.users` UUIDs without breaking foreign keys | RapidArc | ✅ Resolved — 14 of 14 linked, zero broken links |
| 6 | Google service account, Shared Drive, Supabase, B2 and OAuth credentials | Ashmeet / RapidArc | ✅ Done 3 Oct 2026 |

---

## Decisions made mid-build

Anything decided during a session that isn't already in `context.md` or `techstack.md` goes here, then gets promoted into those files.

| Date | Decision | Reason |
|---|---|---|
| 23 Sep 2026 | Raw returns to Google Drive, uploaded via an in-app wrapper rather than Drive's UI or a desk agent | The server opens a Drive resumable session as the service account and hands the browser only the session URI; chunks go browser to Google directly with no Google credentials on the client. Sessions last a week, so progress survives a closed tab — the user re-picks the same file and continues from Google's byte count. Cameramen need no Google access at all; editors need Shared Drive read. B2 keeps cuts, voice notes and library assets, because Drive cannot give an expiring per-view link or an instrumentable player for timestamped review. Supersedes the B2-only decision below. |
| 23 Sep 2026 | ~~Dropped Google Drive; all media on Backblaze B2~~ (superseded same day) | Footage originates on camera cards that reach an office machine, not on phones — so Drive's mobile app solved a problem this agency does not have, while importing a service-account quota trap, a Workspace tier requirement, a 2TB ceiling and polling-based status sync. B2 Event Notifications (now GA) replace polling with signed webhooks. Google OAuth is retained for sign-in only. |

---

## Not yet designed

- RapidArc platform console (Phase 11)

---

## How to update this file

At the end of every session, whether the phase finished or not:

1. Update the header block — date, current phase, next action.
2. Update the phase status table.
3. Add a session log entry at the top with: what was done, what was not, any deviation from the phase file, anything carried forward.
4. Add or resolve blockers.
5. Record any new decision in the decisions table.

Be specific. "Worked on Phase 3" is useless to the next session. "Content items CRUD and status transitions done; calendar view renders but the list-view toggle is unwired" is what the next session needs.
