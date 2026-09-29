# Phase 0 — Foundation

## Objective

Stand up the Next.js application, the Supabase database with its full schema and row-level security, and realistic seed data. Verify by script that both storage paths work end to end — a Google Drive resumable upload session driven from a browser origin, and Backblaze B2 presigned upload with ranged streaming — before a single feature is built on top of them.

Nothing user-facing ships in this phase. The deliverable is a project that runs, a database that holds believable data, and proof that both storage layers behave.

## Context

This is the first build phase. Only the design prototypes in `ui-prototypes/` and the docs in `docs/` exist. Read `docs/context.md` and `docs/techstack.md` before starting — especially §2, the upload wrapper, which is the central design of the system.

**Blocking prerequisite:** confirm the agency's Google Workspace plan is Business Standard or above. Business Starter has no Shared Drives, and a service account cannot write anywhere else. If the plan is Starter, stop and escalate rather than working around it.

---

## Step 1 — Project scaffold

### What to do

Create a Next.js app with the App Router and TypeScript, using the folder structure in `docs/techstack.md` §7. Configure Tailwind, ESLint and Prettier.

Copy `theme.css` from `ui-prototypes/` into `styles/theme.css` and import it in the root layout. Mirror its `:root` custom properties into `tailwind.config.ts` under `theme.extend.colors`, `borderRadius` and `boxShadow`, using the same names, so both systems point at identical values.

Add Plus Jakarta Sans via `next/font/google`, weights 400–800.

Create empty route groups with placeholder pages: `(auth)/login`, `(admin)`, `(manager)`, `(editor)`, `(cameraman)`, `approve/[token]`, `platform`.

Move `ui-prototypes/` to the repo root, outside `app/`, so it is never bundled.

### Checkpoint 1

- [ ] `npm run dev` starts with zero errors and zero warnings
- [ ] `npm run build` completes successfully
- [ ] All seven placeholder routes return 200, not 404
- [ ] `styles/theme.css` is imported and its custom properties resolve in the browser inspector
- [ ] An element using `bg-violet` and one using `var(--violet)` render the identical colour
- [ ] Plus Jakarta Sans loads — confirmed in the Network tab, not assumed
- [ ] `ui-prototypes/` is excluded from the build output

---

## Step 2 — Environment contract

### What to do

Create `.env.example` containing every variable in `docs/techstack.md` §6, with empty values and a one-line comment for each.

Create `lib/env.ts` validating all environment variables at startup with Zod, throwing a named error if any are missing. Separate server-only variables from `NEXT_PUBLIC_` ones and ensure server-only values never reach a client component. Add `.env.local` to `.gitignore`.

Generate `CREDENTIAL_ENCRYPTION_KEY`, `CRON_SECRET` and both VAPID keys now, documenting the commands used in `docs/techstack.md` §9.

### Checkpoint 2

- [ ] `.env.example` lists every variable from techstack §6 with a comment
- [ ] Removing any required variable causes startup to fail with a message naming it
- [ ] Importing server-only env values into a client component fails the build
- [ ] The service account private key loads correctly with escaped newlines
- [ ] `.env.local` is gitignored and absent from `git status`

---

## Step 3 — Core schema

### What to do

Write Supabase migrations creating the tables below. **Every table except `agencies` carries `agency_id uuid not null references agencies(id)`.** Every table has `created_at timestamptz not null default now()`.

**Tenancy and identity**

- `agencies` — id, name, slug (unique), status (`active` | `suspended`), logo_url
- `agency_integrations` — agency_id (unique), drive_service_account_email, drive_service_account_key_enc, shared_drive_id, b2_bucket, b2_prefix, b2_key_id_enc, b2_application_key_enc, updated_at. All `_enc` columns are encrypted at the application layer and never returned to any client.
- `users` — id (matches `auth.users.id`), agency_id, email, full_name, initials, role (`platform_owner` | `admin` | `brand_manager` | `editor` | `cameraman`), avatar_gradient, phone, is_active

**Clients and scope**

- `clients` — agency_id, code (unique per agency), name, handle, niche, manager_id → users, status (`active` | `onboarding` | `paused`), onboarded_at, drive_folder_id
- `client_scope` — agency_id, client_id, month (date, first of month), reels, posts, carousels, stories. Unique on (client_id, month).

**The pipeline spine**

- `content_items` — agency_id, client_id, title, slug, type (`reel` | `post` | `carousel` | `story`), concept, script, instructions_editor, instructions_cameraman, reference_links (jsonb), planned_date, planned_time, status (enum below), assigned_editor_id → users, deadline, created_by → users, updated_at
- `monthly_plans` — agency_id, client_id, month (date), status (`draft` | `sent_to_client` | `approved` | `changes_requested`), approved_at, notes. Unique on (client_id, month).
- `shoots` — agency_id, client_id, title, scheduled_start timestamptz, scheduled_end timestamptz, location, cameraman_id → users, status (`scheduled` | `completed` | `raw_uploaded` | `cancelled`), drive_folder_id, drive_folder_link, raw_detected_at, created_by
- `shoot_items` — shoot_id, content_item_id, idea_slug, drive_subfolder_id, drive_subfolder_link, raw_uploaded_at, marked_by. Primary key (shoot_id, content_item_id). **A join table, not a foreign key on either side.**

**Raw uploads**

- `upload_sessions` — agency_id, shoot_id, shoot_item_id, file_name, file_size_bytes, mime_type, **session_uri_enc** (encrypted — this is a bearer capability), bytes_received, status (`active` | `complete` | `expired` | `failed`), expires_at, started_by → users, completed_at
- `raw_files` — agency_id, shoot_id, content_item_id (nullable), drive_file_id (unique), drive_link, file_name, size_bytes, mime_type, uploaded_at, source (`wrapper` | `external`)

**Edited media and review**

- `deliverable_versions` — agency_id, content_item_id, version (int), b2_key, file_size_bytes, duration_seconds, uploaded_by → users, uploaded_at, status (`submitted` | `changes_requested` | `internally_approved` | `client_approved`). Unique on (content_item_id, version).
- `comments` — agency_id, version_id, author_id → users (nullable for client comments), author_label, timestamp_start numeric, timestamp_end numeric, body, voice_note_key, transcript, source (`internal` | `client`), resolved_at
- `approval_links` — agency_id, content_item_id, version_id, token_hash, pin_hash, expires_at, revoked_at, viewed_at, responded_at, response (`approved` | `changes`), client_name, created_by → users. Hashes only — never the raw token or PIN.
- `post_schedule` — agency_id, content_item_id, scheduled_at timestamptz, caption, bg_music_ref, posted_at, posted_by → users
- `library_assets` — agency_id, client_id, folder_name, name, b2_key, kind, file_size_bytes, uploaded_by → users

**System**

- `activity_log` — agency_id, actor_id → users (nullable), actor_type (`user` | `system` | `client`), entity_type, entity_id, action, from_state, to_state, metadata jsonb
- `drive_sync_state` — agency_id, shared_drive_id, page_token, last_polled_at. Cursor for the backstop poll.
- `push_subscriptions` — agency_id, user_id, endpoint (unique), p256dh, auth
- `notifications` — agency_id, user_id, type, title, body, link, read_at

**`content_items.status` enum, in pipeline order:**

```
planned, calendar_approved, shoot_scheduled, raw_uploaded,
with_editor, cut_submitted, changes_requested, internally_approved,
with_client, client_changes, client_approved, scheduled, posted, archived
```

Add indexes on every `agency_id`, every foreign key, `content_items(client_id, status)`, `content_items(planned_date)`, `shoots(scheduled_start)`, `raw_files(drive_file_id)`, `upload_sessions(shoot_item_id, status)`, `activity_log(entity_type, entity_id)` and `approval_links(token_hash)`.

### Checkpoint 3

- [ ] All 18 tables exist and `npx supabase db reset` runs clean from scratch
- [ ] Every table except `agencies` has a non-nullable `agency_id` with a foreign key — verified via `information_schema`
- [ ] `shoot_items` has a composite primary key and no `shoot_id` column exists on `content_items`
- [ ] `raw_files.drive_file_id` is unique, so a replayed completion cannot double-insert
- [ ] An invalid `content_items.status` value is rejected by the enum
- [ ] A duplicate (content_item_id, version) is rejected
- [ ] A duplicate (client_id, month) in `client_scope` is rejected
- [ ] Generated TypeScript types exist in `types/database.ts` and compile

---

## Step 4 — Authorization foundation

### What to do

Create `lib/auth/can-access.ts` exporting a single `canAccess(user, resource, action)`. This is the only authorization logic in the codebase:

- `platform_owner` — crosses `agency_id`; all actions
- `admin` — all resources within their own `agency_id`
- `brand_manager` — clients where `manager_id` is their user id, and everything belonging to those clients
- `editor` — content items where `assigned_editor_id` is their user id; read-only on the parent client
- `cameraman` — shoots where `cameraman_id` is their user id, and content items linked through `shoot_items`

Write RLS policies on every table as a second wall, using SQL helpers `auth_agency_id()` and `user_role()`. Do not rely on RLS alone and do not skip it.

**`upload_sessions.session_uri_enc` must never be readable through RLS by any role.** It is served only by the upload route, to the one user who owns that session, after `canAccess()` passes.

Create `lib/supabase/admin.ts` exporting a service-role client that throws if imported from a client component.

### Checkpoint 4

- [ ] `canAccess` has unit tests covering all five roles against all resource types, including negative cases
- [ ] RLS is enabled on all 18 tables — verified via `pg_tables`
- [ ] A `brand_manager` selecting `clients` returns only their own, tested with a real JWT
- [ ] An `editor` selecting `content_items` returns only their assignments
- [ ] A `cameraman` selecting `shoots` returns only their own
- [ ] Selecting `session_uri_enc` directly through the API returns nothing, for every role including admin
- [ ] Importing `lib/supabase/admin.ts` into a client component fails the build
- [ ] No file outside `lib/auth/` contains a role comparison — verified by grepping for `role ===`

---

## Step 5 — Seed data

### What to do

Write `supabase/seed.sql` using the canonical values from `docs/context.md` exactly. Anchor everything to **23 September 2026**.

**Two agencies.** "Ashmeet SMMA" is the real tenant. "Northside Social" exists purely so cross-tenant leaks are detectable — 1 admin, 2 clients, 5 content items.

For Ashmeet SMMA:

- **8 users** — Ashmeet (admin), Jaspreet / Nikhil / Manreet (brand_manager), Rohit / Simran (editor), Harpreet / Vikram (cameraman)
- **6 clients** with the codes, handles, niches and managers from context.md
- **`client_scope` for September 2026** matching each client's SoW total
- **~40 content items** covering all 14 statuses at least twice, including the ten named sample ideas
- **6 shoots** — one completed with raw present (22 Sep), one completed with raw *missing* (20 Sep, driving Pending uploads), four upcoming (24, 25, 26 Sep and 2 Oct)
- **`shoot_items` proving many-to-many** — one shoot covering three content items, and one content item linked to two shoots
- **`raw_files`** for the 22 Sep shoot with plausible Drive file ids, names and sizes
- **`upload_sessions`** in three states: one `complete`, one `active` at 63% (driving the resume UI), one `expired`
- **`deliverable_versions`** — one item with three versions showing a full revision loop, one with a single approved version, several with none
- **`comments`** — timestamped internal comments, at least one with `voice_note_key` and `transcript`, at least one with `source = 'client'`
- **`approval_links`** — one active, one expired, one revoked, one responded with `changes`
- **`monthly_plans`** — September approved for all six, October `sent_to_client` for two and `draft` for the rest
- **`post_schedule`** — 8 posted, 5 scheduled in the future
- **`library_assets`** — 3 folders per client
- **`activity_log`** — a realistic trail for every transition above, spread across 30 days with varied actors

**Edge cases to include deliberately:** a client with zero delivered (Verdant Gym), one at 100% (Grover Motors), an item 6 days past deadline (Khanna Jewellers), an item returned to `client_changes` after `internally_approved`, and a shoot whose raw never arrived.

### Checkpoint 5

- [ ] `npx supabase db reset` seeds without error and is idempotent
- [ ] `select status, count(*) from content_items group by status` returns ≥2 rows for all 14 statuses
- [ ] A query proves one shoot has 3 linked items and one item has 2 linked shoots
- [ ] Scope-delivered counts match the Delivered column in context.md for all six clients
- [ ] `upload_sessions` contains one complete, one active at partial progress, one expired
- [ ] At least one `comments` row has both `voice_note_key` and `transcript`
- [ ] `approval_links` contains one active, one expired, one revoked, one responded
- [ ] `activity_log` has >100 rows spanning ≥30 days
- [ ] Northside Social's data exists and is fully separate

---

## Step 6 — Drive folder provisioning

### What to do

Write `scripts/verify-drive.ts`, runnable with `npx tsx`. Using the service account, it must:

1. Authenticate and confirm it can see the Shared Drive named in `GOOGLE_SHARED_DRIVE_ID`
2. Create a nested folder `__verify / 2026-09 / 2026-09-23 Test Shoot / test-idea`
3. Read back the folder's `webViewLink`
4. Call `changes.getStartPageToken` and store it in `drive_sync_state`
5. Delete the `__verify` tree
6. Print a clear pass or fail for each step

Create `lib/drive/folders.ts` with the provisioning helper, so Phase 4 inherits working code.

**If this fails with a storage quota error, the service account is writing to My Drive rather than a Shared Drive.** Fix the Shared Drive membership — do not work around it by impersonating a user.

### Checkpoint 6

- [ ] `npx tsx scripts/verify-drive.ts` passes all six steps
- [ ] The folder tree was visibly created and then removed, confirmed in the Drive UI
- [ ] The folder's `webViewLink` opens correctly in a browser
- [ ] `drive_sync_state` holds a non-null `page_token` after the run
- [ ] The folder path format matches `Client / YYYY-MM / YYYY-MM-DD Shoot / [idea]`
- [ ] Created folders are owned by the Shared Drive, not an individual — checked in Drive's details panel

---

## Step 7 — The upload wrapper, proven end to end

### What to do

**This is the riskiest thing in the build and it gets proven now, not in Phase 4.**

Build `lib/drive/sessions.ts` and a minimal test page at `/dev/upload` — deliberately crude, no design work.

Server side, three routes: create a session (server authenticates as the service account, `POST`s to `https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable` with the target folder as parent, stores the returned `Location` session URI encrypted in `upload_sessions`, returns it to the authorized caller); query progress (`PUT` with `Content-Range: bytes */TOTAL` to ask Google how many bytes it holds, updating `bytes_received`); and complete (records the returned Drive file id into `raw_files`).

Client side, the test page chunks a picked file and `PUT`s each chunk directly to the session URI with the correct `Content-Range`, **sending no Google credentials** — the session URI carries authorization. Report progress.

Then prove the three things that decide whether this architecture works at all:

- **CORS.** Drive must accept cross-origin `PUT`s from the app's origin. If it does not, the entire wrapper is dead and you need to know today.
- **Resume.** Upload part of a large file, close the tab, reopen, re-pick the same file, and continue from Google's byte count rather than from zero.
- **Expiry.** Confirm the stored `expires_at` is set a week out, and that an expired session fails in a way the app can detect and recover from by starting fresh.

### Checkpoint 7

- [ ] A 500MB file uploads to the correct Shared Drive subfolder through the test page
- [ ] Bytes never pass through the Next.js server — confirmed in the Network tab
- [ ] The chunk `PUT`s carry no `Authorization` header and still succeed
- [ ] Cross-origin `PUT`s from the app origin are accepted by Google
- [ ] Closing the tab at ~40%, reopening and re-picking the same file resumes from Google's byte count
- [ ] A progress query returns the byte count Google actually holds, matching `bytes_received`
- [ ] Completion writes a `raw_files` row with the real `drive_file_id`, and the file opens in Drive
- [ ] Replaying the completion call produces exactly one `raw_files` row
- [ ] `session_uri_enc` is encrypted at rest and appears in no log output
- [ ] A user requesting a session for a shoot they are not assigned to receives 403
- [ ] An expired session is detected and reported as recoverable, not as a generic failure

---

## Step 8 — B2 verification

### What to do

Write `scripts/verify-b2.ts`, runnable with `npx tsx`:

1. Generate a presigned multipart upload URL and upload a small binary file directly, not through the app server
2. Generate a presigned GET and fetch it back, confirming bytes match
3. Issue a ranged request (`Range: bytes=0-99`) and confirm a `206 Partial Content` response — **this is what makes video scrubbing work; if it fails, the review UI is broken before it is built**
4. Confirm the bucket rejects unsigned public access
5. Delete the test object

Create `lib/b2/presign.ts` and `lib/b2/keys.ts` with the helpers, for Phases 5 and 6 to reuse.

### Checkpoint 8

- [ ] `npx tsx scripts/verify-b2.ts` passes all five steps
- [ ] The ranged request returns 206 with exactly 100 bytes
- [ ] Fetching the object URL without a signature returns 401 or 403
- [ ] Round-tripped bytes are byte-identical to the original

---

## Step 9 — Cross-tenant isolation test

### What to do

Write `tests/isolation.test.ts`. For every table carrying `agency_id`, authenticate as Ashmeet SMMA's admin and assert that querying returns zero Northside Social rows. Repeat as brand_manager, editor and cameraman.

Add a test asserting a brand_manager sees only their own clients — Jaspreet must see Ramana Dental and Grover Motors and nothing else.

Add a test asserting no role can read `upload_sessions.session_uri_enc` through the data API.

**Write this now, before there is anything to leak.**

### Checkpoint 9

- [ ] `npm test` runs the isolation suite and passes
- [ ] The suite covers all 17 tables carrying `agency_id`
- [ ] Deliberately breaking one RLS policy makes the suite fail — verify this, don't assume it
- [ ] Jaspreet's client query returns exactly 2 rows
- [ ] No role can read a session URI through the data API

---

## Self-Audit Instruction

Before declaring this phase complete, you must:

1. Re-read every checkpoint in this phase file
2. Test each one for real — run the query, execute the script, upload an actual 500MB file and interrupt it. Step 7 cannot be verified by reading code.
3. Return a structured report:
   ✅ [Checkpoint] — Pass
   ⚠️ [Checkpoint] — Partial: [specific reason]
   ❌ [Checkpoint] — Fail: [specific reason]
4. Fix all failures and partials before reporting phase complete.
5. Only say "Phase 0 Complete" when every checkbox is green.
6. Update `docs/progress.md`: mark Phase 0 done with the date, log what was built, record deviations, and list anything carried into Phase 1.

## Final Phase 0 Checklist

- [ ] Next.js app builds and runs, theme tokens available in both CSS and Tailwind
- [ ] Environment validated at startup; no secret reachable from the client bundle
- [ ] 18 tables migrated with RLS enabled and correct constraints
- [ ] `canAccess()` implemented and unit-tested as the sole authorization logic
- [ ] Seed data covers all 14 statuses, the many-to-many, the revision loop and every named edge case
- [ ] Drive folder provisioning verified live against a Shared Drive
- [ ] **The upload wrapper proven end to end: CORS accepted, resume working, expiry handled**
- [ ] B2 presigned upload and ranged streaming verified live
- [ ] Cross-tenant isolation test written and passing
- [ ] Self-audit passed with all green
- [ ] `docs/progress.md` updated
- [ ] Manual verification done by architect
