# progress.md — Build state

> **Read this first in every session.** It is the only handoff between Claude Code sessions.
> Update it whenever a phase completes, and whenever a session ends mid-phase.

**Last updated:** 3 October 2026
**Updated by:** Codex (Phase 3 implementation)
**Current phase:** Phase 3 — in progress; Phase 0, 1 and 2 completion audits remain open
**Next action:** Verify live create/edit/archive and monthly approval controls, then complete the role matrix. The six-client list and September planner data render in Ashmeet's browser. See `ashmeet-smma/docs/phase-3-audit.md`.

---

## Phase status

| Phase | Name | Status | Completed |
|---|---|---|---|
| 0 | Foundation — schema, RLS, seed, env, external service verification | 🟡 In progress | — |
| 1 | UI conversion — port approved HTML into Next.js components, pixel-identical, static data | 🟡 In progress | — |
| 2 | Auth, roles, shell — Google OAuth, session, role routing, permission matrix | 🟡 In progress | — |
| 3 | Clients + Content Planner — the pipeline spine | 🟡 In progress | — |
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
