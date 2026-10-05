# Phase 6 review and approval audit

Status (5 Oct 2026): migration `009_phase6_review.sql` is applied live. Rollback-only database checks and the temporary live HTTP/Edge checks in `scripts/qa-phase6-7-live.mjs` pass. Real microphone and phone checks, and successful transcription, remain open.

## What was built

- **Migration `009_phase6_review.sql`** (additive, one transaction): `comments.transcript_status` and `edited_at`; `approval_links.failed_attempts` and `locked_at`; unique token-hash index; `approval_link_views` log (RLS on, no API-role access); service-role-only functions `phase6_review_decision`, `phase6_reopen_item`, `phase6_create_link`, `phase6_revoke_link`, `phase6_pin_attempt`, `phase6_record_view`, `phase6_client_respond`; `phase5_complete_cut` recreated so an editor can resubmit from `changes_requested` / `client_changes`.
- **Comments** (`/api/versions/[id]/comments`, `/api/comments/[id]`): bound to a `deliverable_versions` row, point or range timestamp, edit/delete by the author only, resolved toggle (reviewer or the assigned editor). Only the latest version accepts new comments. UI: `CommentsPanel` beside the player; click a time to seek; filter All / Unresolved / Resolved.
- **Voice notes** (`/api/voice-notes/presign`, `/api/comments/[id]/voice`, `/api/comments/[id]/transcribe`): MediaRecorder, hard stop at 2:00, presigned PUT to B2, presigned GET to play. Transcription is a separate call after the comment is saved; failure sets `transcript_status = 'failed'`, the comment and audio stay, and Retry is offered. Microphone denial, no microphone and unsupported browsers each show a plain message.
- **Internal review** (`/api/review/[itemId]/decision`): Approve / Send changes in Editors' den. Send changes needs at least one unresolved comment on the latest cut. Editors get 403. Both write `activity_log`. The editor is notified and the item appears in Re-do immediately.
- **Magic links** (`/api/review/[itemId]/link` GET/POST/DELETE): 32-byte token (base64url), 4-digit PIN, SHA-256 of the token and a salted scrypt hash of the PIN stored, 7-day expiry, scoped to one version, regenerate revokes the previous link, URL and PIN returned once. Item moves to `with_client` on first send.
- **Client page** `/approve/[token]`: public, no session, noindex, no-referrer, mobile first. PIN, then client brand name, idea title, player, Approve / Request changes. Distinct screens for invalid, expired, revoked, locked and already-responded. A PIN-verified browser holds a 30-minute signed HttpOnly cookie; the media and respond routes require it. Five wrong PINs lock the link (counted in the database, so concurrent guesses cannot beat it). Every page view is logged with IP and user agent; `viewed_at` sets once.
- **Client response**: Approve sets response, `responded_at`, version and item `client_approved`, `actor_type = 'client'`. Request changes stores the text verbatim as a `source = 'client'` comment and moves the item to `client_changes`. Manager (and editor, for changes) get a `notifications` row, shown as an "Updates" card in Editors' den.
- **Reopen** (`/api/review/[itemId]/reopen`): a `client_approved` item goes back to `client_changes` with a required note, stored as an internal comment so the editor sees it.
- **Editor Re-do**: lists `with_editor`, `changes_requested` and `client_changes` items with versions; shows the latest cut and its comments (voice notes, transcripts, client text) read-only; the editor can mark comments resolved and upload the next cut.
- The generic planner status route and dropdown no longer offer `changes_requested`, `internally_approved`, `with_client`, `client_changes` or `client_approved`; those states are reachable only through the review routes above.

## Live verification and remaining checks

1. Migration 009 exists live; `node --env-file=.env.local scripts/verify-phase6-migration.mjs` passed its rollback-only checks on 5 Oct 2026.
2. Temporary admin, manager, other-manager, and editor identities passed role/JWT checks. On a real B2 MP4, the live routes passed timed comments, author-only edit, resolve/reopen, version isolation, reviewer decision, editor Re-do, approval, one-time token/PIN, 5-attempt lock, revoked/expired/responded states, media range requests, client approval/changes, and manager reopen. Temporary data and B2 objects were removed by the QA script.
3. Headless Edge at 390px showed the public client page with player and actions, no horizontal overflow, and played the MP4. This is a browser emulation, not a physical phone check.
4. Voice-note presign, B2 PUT, saved comment, editor playback URL, and the transcription failure state passed. The test uploaded an MP4 fixture; the actual microphone/MediaRecorder UI and microphone permission errors still need a device/browser check.
5. `TRANSCRIPTION_API_KEY` is absent from `.env.local`, so successful speech-to-text cannot be verified. Configure a provider and test a spoken note, retry, and saved transcript. The failure state was verified and preserves the comment/audio.
6. B2 PUT works from the QA client. Verify browser CORS for voice uploads and add the production origin before launch. Check the public page on an actual phone without a workspace session.

## Deviations from the phase file

- Transcription provider is not named in the spec; implemented against the OpenAI-compatible API (no new dependency, plain `fetch`).
- The in-app notification is a dismissible "Updates" card in Editors' den, not the TopNav bell (the bell is Phase 8).
- Editors can mark comments resolved but cannot create, edit or delete them.
- The client link is bound to the PIN-verified cookie rather than re-sending the PIN on each call.
- A client's later change request after approval arrives through the manager reopening the item; the link itself accepts only one response, as the phase requires.
- Phase 3's `phase3_transition` and `allowedTransitions` are unchanged: `client_approved` to `client_changes` is handled by `phase6_reopen_item`, not the generic transition.

## Checkpoint map (for verification)

| Checkpoint | Where to look |
|---|---|
| 1 Comments | `CommentsPanel`, `/api/versions/[id]/comments`, `/api/comments/[id]` |
| 2 Voice notes | `VoiceRecorder`, `/api/voice-notes/presign`, `/api/comments/[id]/transcribe` |
| 3 Internal review | `ReviewPanel`, `phase6_review_decision` |
| 4 Magic links | `/api/review/[itemId]/link`, `phase6_create_link`, `lib/phase6/tokens.ts` |
| 5 Client page | `/approve/[token]`, `/api/approve/[token]/*`, `phase6_pin_attempt`, `phase6_record_view` |
| 6 Client response | `phase6_client_respond`, `phase6_reopen_item`, editor Re-do queue |
