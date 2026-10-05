# techstack.md — Ashmeet SMMA

Single source of truth for the stack. Anything added to `package.json` gets recorded here in the same commit.

---

## 1. Stack at a glance

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | One deploy target for UI and API; server components keep credentials server-side |
| Styling | `theme.css` tokens, mirrored into Tailwind config | Prototypes are hand-written CSS; preserve them rather than rewriting |
| UI primitives | shadcn/ui | Tables, dialogs, drawers, calendars without committing to a library's look |
| Database | Supabase (PostgreSQL) | Managed Postgres, RLS, generous free tier |
| Auth | Supabase Auth, Google OAuth only; `@supabase/ssr` for Next.js cookies | The team already has Google accounts; persistent PKCE sessions and server-side refresh |
| Authorization | Server-side `canAccess()` + RLS behind it | Defence in depth; RLS alone is too easy to get subtly wrong |
| **Raw footage** | **Google Drive Shared Drive, via our own upload wrapper** | Drive resumable sessions give week-long resume; the wrapper keeps the cameraman out of Drive entirely |
| **Edited cuts, voice notes, library** | **Backblaze B2 (S3-compatible)** | Presigned URLs, ranged streaming for scrubbing, expiring links for the client page |
| Scheduled jobs | Supabase `pg_cron` + `pg_net` | Avoids Vercel's cron frequency limits on lower tiers |
| Notifications | Web Push (VAPID) | Locked decision: no WhatsApp, no email |
| Transcription | Whisper-class speech-to-text API | Voice notes on feedback only — the single AI touchpoint |
| Validation | Zod | Every route boundary |
| Hosting | Vercel | Zero-config for Next.js |
| Monitoring | Sentry + `activity_log` table | You will need traces |

---

## 2. The upload wrapper — how raw footage actually moves

This is the central design of the system and the part most likely to be misunderstood.

**The cameraman never touches Google.** No Google sign-in, no Drive app, no Drive UI, no folder permissions. He opens a page in our product, picks his files, and watches a progress bar. The footage lands in the agency's Shared Drive.

The mechanism, per file:

1. The browser tells our server the file name, size and MIME type, and which shoot and content item it belongs to.
2. The server, authenticated as the **service account**, sends a `POST` to `https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable` with the target Shared Drive folder as parent. Google replies with a `Location` header containing the **resumable session URI**.
3. The server stores that session URI, encrypted, in `upload_sessions`, and returns it to the browser.
4. The browser `PUT`s the file in chunks directly to the session URI with a `Content-Range` header. **No Google credentials are needed on these requests** — the session URI carries the authorization itself. Bytes go browser → Google, never through our server.
5. The final chunk's response returns the Drive file resource. The browser posts the file id back to our server, which writes a `raw_files` row.

Two properties that make this work:

**A resumable session URI expires after one week.** Progress survives a closed tab, a crashed browser, a rebooted laptop, even overnight. To resume, send a `PUT` with `Content-Range: bytes */TOTAL_SIZE` and Google replies with how many bytes it already has; continue from there.

**The session URI is a bearer capability.** Google's own documentation warns that anyone holding it can upload to that target without further authentication. So: store it encrypted, transmit it only over HTTPS to an authorized user, scope it to exactly one file, and never log it.

### The honest limitation

Resume is not automatic. A browser cannot reopen a file from disk after a page reload — that is a hard security rule in every browser, not a Drive issue. So after an interruption the user must **re-select the same file**, and the upload then continues from the byte Google already holds rather than starting over.

Design for this rather than hiding it: the upload page must list interrupted uploads with their percentage and a "Resume — choose the same file again" action, and must verify the re-picked file's size matches before continuing.

---

## 3. Storage layout

**Google Drive (raw):**

```
Shared Drive
  └── {Client Name}
        └── {YYYY-MM}
              └── {YYYY-MM-DD} {Shoot Title}
                    └── {idea-slug}
                          └── uploaded files
```

**Backblaze B2 (everything else):**

```
agency-{agency_id}/cuts/{content_item_id}/v{n}.mp4
agency-{agency_id}/voice/{comment_id}.webm
agency-{agency_id}/library/{client_code}/{folder}/{filename}
```

---

## 4. Architecture decisions and rationale

**Why a wrapper rather than sending people to Drive.** Sharing a Drive folder link means the cameraman needs Google access to that folder, sees Google's interface, and can move or delete things. It also means our system only learns an upload happened by polling Drive's changes feed. The wrapper keeps the experience inside one product, removes all Drive permissions for field users, and tells us the moment a file completes.

**Why Drive for raw and B2 for cuts.** They are different problems. Raw is huge, uploaded once, downloaded by staff, deleted after 30 days — and the Workspace seat is already being paid for. Cuts are small, streamed with precise seeking for timestamped review, and shown to unauthenticated clients on expiring links. Drive cannot give an expiring per-view link or an instrumentable video element; B2 does both. Drive's own preview iframe is Google's player with no published API to seek it, which would make timestamped comments impossible.

**The service account must write into a Shared Drive.** A service account has no storage quota of its own; creating files in "My Drive" fails outright. It is added as Content Manager on a Shared Drive owned by the agency's Workspace, so files belong to the organisation and survive staff turnover. **This requires Google Workspace Business Standard or above — Business Starter has no Shared Drives.**

**Storage ceiling.** Business Standard gives 2TB pooled per licensed seat. One seat means 2TB total. Raw deletion is manual by design, so the storage view and threshold alerts at 70% and 85% are required in v1, not optional. Another seat buys another 2TB with zero code change.

**Drive changes polling remains, as a backstop only.** The wrapper tells us when an upload finishes, so detection is no longer inference. A low-frequency `changes.list` poll catches anything uploaded outside the wrapper — someone dropping files straight into Drive from a desktop.

**Media never passes through the server.** Vercel caps request bodies around 4.5MB. Raw goes browser → Google session URI. Cuts go browser → B2 presigned multipart.

**Multi-tenant from day one.** `agency_id` on every table. Per-agency Drive and B2 credentials live in `agency_integrations`, encrypted and write-only from the UI. RapidArc is `platform_owner`, the only role crossing `agency_id`.

---

## 5. Data model shape

Full schema lives in the Phase 0 file. The spine:

```
agencies ─┬─ agency_integrations   (encrypted Drive + B2 config)
          ├─ users (role, agency_id)
          ├─ clients (scope_of_work, assigned_manager_id)
          │    └─ content_items      ← the central entity
          │         ├─ shoot_items ──→ shoots ──→ drive folders
          │         │         └──→ upload_sessions ──→ raw_files
          │         ├─ deliverable_versions  (v1, v2, v3 in B2)
          │         │    └─ comments (timestamped, optional voice_note_key + transcript)
          │         ├─ approval_links (token, PIN hash, expiry, revoked)
          │         └─ post_schedule (datetime, caption, bg_music_ref)
          ├─ drive_sync_state (backstop polling cursor)
          └─ activity_log (actor, entity, from_state, to_state, at)
```

Non-obvious constraints: `shoot_items` is a join table, not a foreign key — one shoot covers many ideas. `upload_sessions` holds the encrypted session URI and byte progress, and is what makes resume possible. `activity_log` is written on every transition from Phase 0 onward, because the owner's "who did the work" dashboard cannot be backfilled.

---

## 6. Environment variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # server only, never in client bundle

# Google — OAuth for sign-in
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=

# Google — service account for Drive uploads
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY= # escaped newlines
GOOGLE_SHARED_DRIVE_ID=

# Backblaze B2 — cuts, voice notes, library
B2_ENDPOINT=
B2_REGION=
B2_BUCKET=
B2_KEY_ID=
B2_APPLICATION_KEY=

# Web Push
NEXT_PUBLIC_VAPID_PUBLIC_KEY=       # public: the browser needs it to subscribe
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=

# Platform
CREDENTIAL_ENCRYPTION_KEY=          # master key for agency_integrations and session URIs
CRON_SECRET=
SENTRY_DSN=                         # optional server error reporting (inert if unset)
# Per-agency Drive and B2 credentials are NOT environment variables: they are entered in the platform console and stored encrypted in agency_integrations.
# The GOOGLE_* and B2_* variables above remain only as the fallback for the original Ashmeet workspace.
NEXT_PUBLIC_SENTRY_DSN=             # optional browser error reporting
SENTRY_AUTH_TOKEN=                  # optional with SENTRY_ORG and SENTRY_PROJECT: uploads source maps at build
TRANSCRIPTION_API_KEY=                # voice-note speech-to-text; unset = transcripts show unavailable with Retry
TRANSCRIPTION_API_URL=              # optional, OpenAI-compatible base URL (default https://api.openai.com/v1)
TRANSCRIPTION_MODEL=                # optional (default whisper-1)
NEXT_PUBLIC_APP_URL=
AUTH_SECRET=                        # NextAuth session signing (interim until Phase 2 moves to Supabase Auth)
```

Server variables are validated by `lib/env.ts` (Zod, `server-only`); an `EnvError` names every missing one. Client-safe values are read through `lib/env.public.ts` only.

**Key generation (run 3 Oct 2026; values live in `.env.local`, never committed):**

```
CREDENTIAL_ENCRYPTION_KEY   openssl rand -base64 32      # AES-256-GCM key, must decode to 32 bytes
CRON_SECRET                 openssl rand -hex 32
AUTH_SECRET                 openssl rand -base64 32
VAPID keys                  npx web-push generate-vapid-keys --json
```

`GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` is the `private_key` field of the service-account JSON, wrapped in double quotes with newlines left as `\n`; `lib/env.ts` restores them.

---

## 7. Folder structure

```
/app
  /(auth)/login
  /(admin)        clients, calendar, den, posting, planner, team, settings
  /(manager)      clients, calendar, den, posting, planner
  /(editor)       todo, redo, library
  /(cameraman)    shoots, pending, upload
  /approve/[token]            client magic-link page
  /platform                   RapidArc console (Phase 11)
  /api
    /upload   session create, resume status, complete
    /media  /content  /shoots  /approvals  /cron  /push
/components  /ui  /shared  /[feature]
/lib
  /supabase   client.ts, server.ts, admin.ts
  /drive      folders.ts, sessions.ts, changes.ts
  /b2         presign.ts, keys.ts
  /auth       can-access.ts        ← the ONLY authorization logic
  /push       send.ts
/types
/supabase/migrations
/docs         claude.md, context.md, techstack.md, progress.md, /phases
/ui-prototypes  the approved HTML + theme.css
```

---

## 8. Known gotchas

| Trap | Handling |
|---|---|
| Service account has no Drive quota | Must write into a Shared Drive, never My Drive |
| Business Starter has no Shared Drives | Confirm the Workspace tier before Phase 0 |
| 2TB pooled ceiling on one seat | Storage view + 70%/85% alerts ship in v1 |
| Session URI is a bearer capability | Encrypt at rest, HTTPS only, one file per session, never log it |
| Session URI expires after one week | Detect expiry and start a fresh session rather than failing silently |
| Browser cannot reopen a file after reload | Resume requires the user to re-pick the same file; verify size before continuing |
| CORS on the session URI | Drive must accept cross-origin PUTs from the app domain; verify in Phase 0, not Phase 4 |
| Drive 750GB/user/day upload cap | Unlikely at this scale; log if approached |
| Vercel 4.5MB request body limit | All media direct-to-origin, never proxied |
| MP4 `moov` atom at end of file | Breaks scrubbing, which timestamped review depends on. Enforce export spec (H.264, AAC, faststart, ≤200MB) and validate client-side. |
| Vercel cron frequency limits | Use Supabase `pg_cron` + `pg_net` |
| RLS as sole authorization | Always pair with `canAccess()` server-side |
| Cross-tenant leakage | Phase 0 seeds two agencies and asserts every route returns empty for the wrong one |

---

## 9. Dependency log

Record every added package here with a one-line reason.

| Package | Reason | Added in |
|---|---|---|
| zod | Environment and route-boundary validation (required by claude.md) | Phase 0 |
| server-only | Makes importing env, the service-role client or B2/Drive helpers from a client component a build error | Phase 0 |
| @aws-sdk/client-s3, @aws-sdk/s3-request-presigner | Real presigned URLs and multipart against B2's S3-compatible API; the earlier hand-rolled helper sent master credentials through the server | Phase 0 |
| googleapis, @supabase/supabase-js, next-auth | Drive service account, database client, interim Google sign-in (replaced by Supabase Auth in Phase 2) | Phase 0 |
| tsx (dev) | Runs verify scripts and the test suite | Phase 0 |
| pg, @types/pg (dev) | Isolation tests exercise RLS as the `authenticated` role with a real JWT subject; the service role bypasses RLS | Phase 0 |
| prettier, prettier-plugin-tailwindcss (dev) | Formatting required by the Phase 0 scaffold step | Phase 0 |
| ~~@auth/core~~ | Removed: unused, and conflicted with next-auth v4's peer range | Phase 0 |
