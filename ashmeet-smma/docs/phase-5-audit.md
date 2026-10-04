# Phase 5 editor pipeline and media audit

Status: development and live setup complete; browser/media verification remains. Phase 5 is **not complete** until the real video and role checkpoints pass.

## Built

- Live Editors' den for admins and brand managers: agency editor load, scoped items, assignment/reassignment with deadline, version history, and playable version controls.
- Transactional `phase5_assign_editor` with role, agency, client-manager, editor-role, and status checks. It logs old and new editors.
- Live editor To do and Re do queues, ordered by deadline. Re do uses existing versions; brief, original/current instructions, change comments, and Drive raw links are shown. Missing raw has an explicit state.
- Direct browser-to-B2 multipart upload for cuts and library assets. The server signs each part and lists parts before completing; video bytes do not pass through Next.js. MP4 and under-200MB validation, progress, retry, re-pick resume, and abort are implemented. Upload sessions are stored with private keys and B2 upload IDs; cut/library completion is atomic in SQL.
- Version numbers increment per content item. The latest version follows status changes; older versions remain read-only. The player fetches short-lived signed URLs on demand, has native video controls plus keyboard and timestamp/seek controls, and detects a `moov` atom behind `mdat` from a small metadata read.
- Live per-client library folders and assets, scoped to assigned editor clients or all admin clients; upload and download use the same authorized media routes.
- New migration: `supabase/migrations/008_phase5_editor_media.sql`. The B2 localhost CORS update is recorded in `scripts/configure-phase5-b2-cors.ts` (dry-run by default).

## Verified without changing live data

- `008_phase5_editor_media.sql` applied in a live Supabase transaction that rolled back. Assignment and reassignment metadata, wrong-manager and wrong-status rejection, first/next per-item version, completion replay, latest-version status update, and library completion passed.
- A temporary 9 MiB B2 object uploaded in two signed parts. Listing parts, multipart completion, object size, ranged GET `206`, and multipart abort passed. Test objects were deleted/aborted.
- TypeScript, targeted ESLint, production build, and all 32 existing tests passed. The anonymous isolation test now accepts both a permission error and a zero-row RLS result; both deny access.
- Live migration applied on 4 October 2026. A read-only check found RLS enabled on `media_upload_sessions`, all three transactional RPCs executable by `service_role` and inaccessible to `anon`/`authenticated`, and zero upload sessions.
- The first CORS update through B2's S3 API was rejected because this bucket has B2 Native CORS rules. The approved update was then applied through the Native API to the existing localhost S3 rule, adding `s3_put` and `content-type` while preserving the native download rule and existing S3 GET/HEAD operations. A signed PUT preflight including `Content-Type` now passes. The temporary two-part B2 test, ranged GET, and abort were rerun successfully.

## Checkpoints still to verify live

| Step | Status | Remaining check |
|---|---|---|
| 1 Assignment | Partial | Assign/reassign through the browser and compare displayed load with SQL. |
| 2 Editor queues | Partial | Sign in as editors; verify Rohit/Simran scope, Drive links, deadlines, and both instruction sets. |
| 3 Cut upload | Partial | Upload a real 120MB H.264/AAC MP4, reject 250MB/non-MP4, retry an interrupted part, cancel and check no orphan. Confirm direct B2 PUTs in Network. |
| 4 Version history | Partial | Submit multiple real cuts to one item, check seeded three-version history and play every available B2 object. Seeded keys are placeholders, so seeded versions cannot play until real objects replace them. |
| 5 Streaming player | Partial | Play a real cut, seek forwards/backwards, inspect `206` requests, expiry refresh, unsigned 403, keyboard controls, and trailing-`moov` warning in the browser. |
| 6 Library | Partial | Upload and download a real asset as an assigned editor; verify admin sees all and another editor does not. Seeded library keys are placeholders. |

Do not call Phase 5 complete until every checkpoint in the Phase 5 specification is verified with real browser/media tests.
