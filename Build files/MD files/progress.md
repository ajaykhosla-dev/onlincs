# progress.md — Build state

> **Read this first in every session.** It is the only handoff between Claude Code sessions.
> Update it whenever a phase completes, and whenever a session ends mid-phase.

**Last updated:** 3 October 2026
**Updated by:** Claude Code
**Current phase:** Phase 1 complete with known issues (see 3 Oct entry); Phase 0 verified live, owner decisions still open
**Next action:** Client reviews the running app and signs off Phase 1 (or the deviations are adjusted); owner decides the Phase 0 schema deviations; then start Phase 2

---

## Phase status

| Phase | Name | Status | Completed |
|---|---|---|---|
| 0 | Foundation — schema, RLS, seed, env, external service verification | ⚠️ Verified live; awaiting owner decisions (see 3 Oct entries) | — |
| 1 | UI conversion — port approved HTML into Next.js components, pixel-identical, static data | ⚠️ Complete with known issues — awaiting client sign-off on the running app | 3 Oct 2026 |
| 2 | Auth, roles, shell — Google OAuth, session, role routing, permission matrix | ⬜ Not started | — |
| 3 | Clients + Content Planner — the pipeline spine | ⬜ Not started | — |
| 4 | Shoots + Raw Upload — scheduling, Drive folders, the upload wrapper | ⬜ Not started | — |
| 5 | Editor pipeline + media — queues, B2 upload, versions, player | ⬜ Not started | — |
| 6 | Review + approval — comments, voice notes, magic links | ⬜ Not started | — |
| 7 | Posting schedule — grid, captions, downloads, mark posted | ⬜ Not started | — |
| 8 | Notifications — web push, cron staleness alerts | ⬜ Not started | — |
| 9 | Owner analytics — SoW vs delivered, team performance | ⬜ Not started | — |
| 10 | Hardening + launch — PWA, offline, storage view, migration | ⬜ Not started | — |
| 11 | RapidArc platform console — tenant onboarding | ⬜ Not started | — |

Status values: ⬜ Not started · 🟡 In progress · ✅ Complete · ⚠️ Complete with known issues

---

## Session log

Newest entries at the top. One entry per session.

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
| 3 | Create the Backblaze B2 bucket and application keys | RapidArc | ✅ Done 3 Oct 2026 |
| 4 | Google service account, Shared Drive, Supabase, B2 and OAuth credentials | Ashmeet / RapidArc | ✅ Done 3 Oct 2026 |

---

## Decisions made mid-build

Anything decided during a session that isn't already in `context.md` or `techstack.md` goes here, then gets promoted into those files.

| Date | Decision | Reason |
|---|---|---|
| 23 Sep 2026 | Raw returns to Google Drive, uploaded via an in-app wrapper rather than Drive's UI or a desk agent | The server opens a Drive resumable session as the service account and hands the browser only the session URI; chunks go browser to Google directly with no Google credentials on the client. Sessions last a week, so progress survives a closed tab — the user re-picks the same file and continues from Google's byte count. Cameramen need no Google access at all; editors need Shared Drive read. B2 keeps cuts, voice notes and library assets, because Drive cannot give an expiring per-view link or an instrumentable player for timestamped review. Supersedes the B2-only decision below. |
| 23 Sep 2026 | ~~Dropped Google Drive; all media on Backblaze B2~~ (superseded same day) | Footage originates on camera cards that reach an office machine, not on phones — so Drive's mobile app solved a problem this agency does not have, while importing a service-account quota trap, a Workspace tier requirement, a 2TB ceiling and polling-based status sync. B2 Event Notifications (now GA) replace polling with signed webhooks. Google OAuth is retained for sign-in only. |

---

## Not yet designed

- Client magic-link approval page (needed before Phase 6)
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
