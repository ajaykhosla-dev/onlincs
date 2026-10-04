# Phase 4 implementation and verification

Status: in progress. Do not mark Phase 4 complete until the live migration, browser role checks, Drive folder check, and large upload/resume checks pass.

## Implemented

- Atomic shoot scheduling, many-to-many shoot items, role scoping, edit/cancel, manual raw marks, arrival transition, and activity/notification writes in `006_phase4_shoots.sql`.
- Durable Drive folder jobs with immediate browser trigger, retry action, and cron recovery. Folder tree is Client / month / dated shoot / idea slug. File uploads require an idea folder.
- Scheduling, provisioning, and upload session creation verify the workspace's configured Shared Drive matches the service account's Drive; a second seeded agency cannot write into Ashmeet's Drive.
- Cameraman upload page with sequential chunked direct-to-Google queue, progress, same-file resume, expiry handling, retry backoff, and large-file warning.
- Temporary admin-only `/admin/upload-test` route renders that same upload component for browser verification while no cameraman login is available. The active-session listing permits the admin's own sessions only; the route should be removed after testing.
- Cameraman live week/day calendar and pending list; admin and manager live month calendars, pending shoots, arrival detail, and reconciliation.
- Editor assigned raw page with direct file and folder links. Editors need read access to the Shared Drive; cameramen do not need Drive access.
- Hourly Drive changes poll at `/api/cron/phase4`, gated by `CRON_SECRET`, plus initial folder scan. `vercel.json` schedules this hourly in production. Vercel Hobby permits only daily cron runs, so hourly production deployment requires Pro or an external hourly scheduler. On a local server, call the endpoint with `Authorization: Bearer <CRON_SECRET>` from an hourly local scheduler.

## Verified

- TypeScript and targeted ESLint pass.
- Rollback-only Supabase transaction passes: 1 shoot with 3 links, the same item on a second shoot, cross-manager denial, update/cancel, queued folder job, item transitions, partial arrival, and full arrival. Test data is rolled back.
- Production build passes and lists the new Phase 4 routes.
- Ashmeet confirmed `/admin/calendar` loads and scheduling plus folder provisioning work in the browser. A read-only Supabase check found the new shoot "Title of Naruto" with one linked idea, a completed folder job, a shoot folder ID, and one idea subfolder ID. The live database now has eight shoots and twelve links.
- Read-only Google Drive API verification found that shoot folder and idea subfolder in the configured Shared Drive, with the idea folder parented to the shoot folder and named for its idea slug.
- Ashmeet confirmed shoot editing works in the browser. A second Drive API check found the edited title reflected in the full folder path: `Khanna Jewellers / 2026-10 / 2026-10-22 Title of Sasuke / ci-khannajewellers-002`.
- A live test exposed that the initial shoot selector offered already posted content. The selector now offers only `calendar_approved` or `shoot_scheduled` ideas; migration `007_phase4_item_eligibility.sql` enforces that rule atomically on new links. A rollback-only check accepted approved `ci-34` and rejected posted `ci-15`; migration 007 was then applied live. The earlier test shoot keeps its historical posted-item link.
- Ashmeet confirmed adding a second idea in the browser. Supabase now has two links for the test shoot and a completed folder job. Read-only Drive verification found exactly two idea subfolders under one shoot folder, with no duplicate shoot folder. The calendar drawer now reports the saved idea count and add/folder result explicitly.
- The first admin upload test found the clip picker disabled. The wrapper now starts with an explicit shoot choice, labels folder readiness, and states which shoot, idea, or folder condition blocks the picker. TypeScript and targeted ESLint pass; a browser upload is still required.
- Ashmeet confirmed the picker now opens. The first small MP4 test stayed at “uploading.” A read-only check found no new upload session at that point, so the stall was before any file bytes reached Drive. The queue now displays its current step, stops retrying known HTTP errors, rejects a no-progress 308 response, and times out unanswered app API calls after 45 seconds. A repeat browser test and its Network result are pending.
- The next browser report clarified that pressing Open in the MP4 picker did not add a row. The file handler was reading the live `FileList` inside a deferred React state update after the input had been cleared. It now copies files synchronously before clearing the input. TypeScript and targeted ESLint pass; queue and actual transfer need browser confirmation.
- Ashmeet confirmed `sample-5s.mp4` reached 100% and `complete` on `/admin/upload-test`. Read-only checks verified the live upload session is complete at 2,848,208/2,848,208 bytes, exactly one `raw_files` row exists for its Drive file ID, and the real Drive file has that size in the correct idea subfolder of the configured Shared Drive. This verifies one small-file path through the admin QA wrapper; the full Phase 4 checkpoint matrix remains open.
- Ashmeet separately confirmed that the browser upload queue works. The full eight-file, three-idea queue checkpoint is still unverified.
- A temporary invited Supabase Auth cameraman identity was created for live API QA and removed afterward. Its JWT had the cameraman role; `/api/shoots` returned only its temporarily assigned shoot, `/cameraman/shoots` loaded, `/admin/calendar` redirected to `/403`, and upload session creation for another shoot returned 403. A 9 MiB direct Drive upload sent 8 MiB, queried Google's saved byte count, signed in again, resumed from 8 MiB, completed, and replayed completion without a duplicate `raw_files` row. The original shoot assignment and arrival timestamp were restored, the QA Auth/workspace user, session, and database file row were deleted, and the QA Drive file was moved to Trash because the service account can trash but cannot permanently delete shared-drive files. This verifies the role and resumable-session API mechanics, not a 5 GB browser upload or visual cameraman screen behavior.

## Still needs live verification

- Migration `006_phase4_shoots.sql` was applied to live Supabase on 4 October 2026. Read-only verification found all six functions, the folder-job table, the upload progress column, and zero fake Drive cursors. Verify the manager and cameraman screens.
- Upload a multi-gigabyte file and an eight-file cross-idea queue through the real wrapper. Close and reopen a tab, re-pick the same file, test a different size, a network drop, and an expired session. Inspect browser Network for direct Google PUTs without Authorization.
- Run the authenticated cron against a direct Drive drop, check cursor advancement and no duplicate for a wrapper-uploaded file. Confirm manager/editor notifications.
- Confirm assigned editor can open files and folders with Shared Drive read access, and unassigned editor receives 403.
- Check 390px cameraman layout and seeded pending shoot in a browser.

The resumable session URI is a bearer capability returned only to the authenticated uploader so the browser can PUT directly to Google. The encrypted `session_uri_enc` field is never returned.

The seed data contains placeholder Drive idea-folder IDs and sample raw-file IDs. The worker replaces placeholder idea folders when it provisions a seeded shoot. Sample raw-file links do not point to real files; use a newly uploaded file to verify editor download links.
