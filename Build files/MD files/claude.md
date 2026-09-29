# claude.md — Ashmeet SMMA Operating System

A role-based PWA replacing WhatsApp and spreadsheets for a 6-person social media agency in Ludhiana. It tracks a content item from idea → shoot → edit → revisions → client approval → posted. Four internal roles (Admin, Brand Manager, Editor, Cameraman) plus a no-login client approval page. Built by RapidArc AI, multi-tenant from day one.

## Read these before working

| File | What's in it |
|---|---|
| `docs/context.md` | Product, roles, pipeline, vocabulary, sample data |
| `docs/techstack.md` | Stack, architecture decisions, env vars, known gotchas |
| `docs/progress.md` | **Where the build currently stands — read first, every session** |
| `docs/phases/phase-N-*.md` | The phase you are executing |
| `ui-prototypes/` | Approved static HTML. Design reference, not app code. Phase 1 converts it; after that, match it. |

## Phase protocol

1. Read `docs/progress.md` to find the current phase. Never assume.
2. Execute only the phase file you were given. Do not work ahead.
3. Run the phase's self-audit and report ✅ / ⚠️ / ❌ per checkpoint.
4. **When a phase completes, update `docs/progress.md` before ending the session:** mark the phase done with the date, log what was built, list any deviations from the phase file, and note open issues carried forward. This file is the only handoff between sessions — if it is stale, the next session starts blind.
5. Also update `docs/progress.md` if a session ends mid-phase, recording exactly what is done and what is not.

## Non-negotiables

- **`agency_id` on every table.** Every query filters by it. No exceptions.
- **Authorization in one place.** A single server-side `canAccess(user, resource, action)`. RLS is the second wall, never the only one. No scattered `if (role === ...)` checks.
- **Brand Managers see only their assigned clients.** This is the rule most likely to leak. Test it.
- **Never expose the Supabase service-role key, Drive credentials, B2 keys or upload session URIs to the client bundle.**
- **Credentials in `agency_integrations` are encrypted and write-only from the UI.** Set and rotate, never read back.
- **Every status transition writes to `activity_log`** with actor, from-state, to-state, timestamp. Analytics depends on this existing from day one.
- **Media never passes through the server.** Raw goes browser → Drive resumable session URI; cuts go browser → B2 presigned URLs.
- **A Drive session URI is a bearer capability.** Encrypt at rest, serve only to the owning user, never log it.
- **No AI anywhere except voice-note transcription.**

## Conventions

- Files `kebab-case`, components `PascalCase`, DB tables and columns `snake_case`, routes `/api/[area]/[action]`
- Zod validation on every route boundary; never trust client input
- Errors: typed results, not thrown strings. User-facing messages never leak internals.
- Dates stored UTC, displayed IST
- UI copy uses the vocabulary in `context.md` — never "ticket", "task", "job" or "asset"

## Do not

- Do not build deferred features: generic Tasks board, Instagram analytics or publishing, video transcoding, WhatsApp or email notifications.
- Do not redesign approved UI. Report mismatches instead of improvising.
- Do not add dependencies without noting them in `techstack.md`.
- Do not mark a phase complete with failing checkpoints.
