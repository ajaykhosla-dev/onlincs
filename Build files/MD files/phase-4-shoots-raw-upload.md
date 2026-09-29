# Phase 4 — Shoots & Raw Upload

## Objective

Make shoots real: scheduled by the brand manager, linked many-to-many to content items, each provisioned with a Drive folder tree, and raw footage uploaded through our own wrapper — a page in our product that pushes bytes straight to Google without the cameraman ever seeing Drive.

## Context

Phase 3 delivered live content items and the state machine. Phase 0 verified Drive folder provisioning, proved the upload wrapper end to end (CORS, resume, expiry) at `/dev/upload`, and left `lib/drive/folders.ts` and `lib/drive/sessions.ts` in place.

This phase takes that proven mechanism and builds the real product around it. Read `docs/techstack.md` §2 before starting — the wrapper is the central design and the part most likely to be misunderstood.

---

## Step 1 — Shoot scheduling

### What to do

Build shoot CRUD. The Schedule a shoot modal captures date, start and end time, client, cameraman, location and a multi-select of content items the shoot will cover.

Write `shoot_items` rows for each selected item, each with an `idea_slug`. **This is a join table — a shoot covers many items and an item may link to more than one shoot.**

Scheduling transitions each linked item to `shoot_scheduled` through `transition()`.

### Checkpoint 1

- [ ] Creating a shoot with 3 items writes 1 `shoots` row and 3 `shoot_items` rows
- [ ] All 3 items move to `shoot_scheduled` with an `activity_log` row each
- [ ] Linking an item already on another shoot succeeds and both links persist
- [ ] A brand manager scheduling for another manager's client receives 403
- [ ] Only users with role `cameraman` appear in the cameraman selector
- [ ] Times store UTC and display IST — verified against a stored row

---

## Step 2 — Drive folder provisioning

### What to do

On shoot creation, provision the folder tree through `lib/drive/folders.ts`: `Client / YYYY-MM / YYYY-MM-DD Shoot Title / [idea-slug]`, one subfolder per linked content item.

Store `drive_folder_id` and `drive_folder_link` on the shoot, and the subfolder id and link on each `shoot_items` row.

Provisioning runs asynchronously — a Drive timeout must not block shoot creation. If it fails, the shoot persists with a visible "Folder pending" state and a retry action. Adding an item to an existing shoot provisions just that subfolder.

### Checkpoint 2

- [ ] Creating a shoot produces the full folder tree in the Shared Drive, confirmed in the Drive UI
- [ ] Folder and subfolder ids and links are stored on the shoot and its `shoot_items` rows
- [ ] Simulating a Drive API failure still creates the shoot and shows the pending state
- [ ] Retry successfully provisions a previously failed tree
- [ ] Adding a fourth item to an existing shoot creates one new subfolder, not a duplicate tree
- [ ] Folders are owned by the Shared Drive, not an individual

---

## Step 3 — The upload wrapper

### What to do

Build `/cameraman/upload`, the real version of the Phase 0 test page. This is the screen a cameraman uses after every shoot, so it must be the simplest thing in the product.

**The flow, per file:** the browser requests a session from `/api/upload/session` with the shoot item, file name, size and MIME type. The server checks `canAccess()`, creates a Drive resumable session as the service account against that item's subfolder, stores the session URI encrypted in `upload_sessions`, and returns it. The browser then `PUT`s the file in chunks directly to the session URI with `Content-Range`, **sending no Google credentials**. On the final chunk, it posts the returned Drive file id to `/api/upload/complete`, which writes a `raw_files` row.

**Multiple files, one queue.** A shoot has several ideas; a card has many clips. Let the cameraman pick files, assign each to an idea, and upload the queue sequentially with per-file and overall progress. Uploading one file at a time is correct here — parallel uploads on a weak connection make everything slower and harder to reason about.

**Resume is a first-class feature, not error handling.** On opening the page, list any `active` sessions for this cameraman with their percentage. Each offers "Resume — choose the same file again". On re-pick, verify the file size matches the session, query Google for the byte count it holds, and continue from there. A size mismatch is refused with a clear message rather than corrupting the upload.

Handle the failure modes explicitly: a network drop pauses and retries the current chunk with backoff; an expired session (older than a week) is marked `expired` and offers a fresh start; a closed tab simply leaves the session `active` for later.

Warn before starting a large upload on a metered connection, and say plainly that the tab must stay open.

### Checkpoint 3

- [ ] A 5GB file uploads to the correct idea subfolder with accurate progress
- [ ] Bytes never pass through the Next.js server — confirmed in the Network tab
- [ ] Chunk `PUT`s carry no `Authorization` header and still succeed
- [ ] A queue of 8 files across 3 ideas uploads sequentially, each landing in the right subfolder
- [ ] Closing the tab at ~40% leaves the session `active`; reopening lists it with the correct percentage
- [ ] Re-picking the same file resumes from Google's byte count, not from zero
- [ ] Re-picking a *different* file of a different size is refused with a clear message
- [ ] A network drop of 60 seconds retries and recovers without user action
- [ ] An expired session is reported as expired and offers a fresh start
- [ ] Completion writes `raw_files` with the real `drive_file_id`, and the file opens in Drive
- [ ] Replaying the completion call produces exactly one row
- [ ] A cameraman requesting a session for someone else's shoot receives 403
- [ ] `session_uri_enc` never appears in any response body or log

---

## Step 4 — Cameraman calendar

### What to do

Wire `/cameraman/shoots` to real data, scoped to the signed-in cameraman's own shoots only. Week and day views, mini calendar with shoot dots, events positioned by start time and duration, current-time line.

The slide-out shows the shoot's real linked content items with concept, script and reference links, and per idea: arrival state (nothing yet, uploading at N%, or arrived with a file count) plus an Upload footage button opening the wrapper pre-scoped to that idea.

Keep Mark raw uploaded as a manual override for footage that reached Drive some other way.

**Update the prototype's copy** — the approved HTML says "Upload raw footage" deep-linking to Drive. It now opens our own upload page. This is the only place the signed-off UI changes, and it changes because the architecture did.

### Checkpoint 4

- [ ] Signed in as Harpreet, only his shoots appear; Vikram's do not
- [ ] Events land in correct hour slots with height proportional to duration
- [ ] The slide-out shows the shoot's actual linked items
- [ ] Upload footage opens the wrapper already scoped to that shoot and idea
- [ ] Per-idea arrival state reflects real `raw_files` and `upload_sessions` rows
- [ ] An in-progress upload shows its percentage on the calendar, not just on the upload page
- [ ] Mark raw uploaded writes `raw_uploaded_at` and `marked_by`
- [ ] Usable at 390px with no horizontal scroll

---

## Step 5 — Manager and admin calendars

### What to do

Wire `/manager/calendar` and `/admin/calendar` to real shoots, scoped by role. Month grid colour-coded by client, upcoming shoots panel with cameraman assigned, and a detail drawer showing linked items with per-item upload state, file counts, total size and the Drive folder link.

Include Pending shoots: past their scheduled end with no raw arrived. Show in-progress uploads distinctly from nothing-started — a manager should be able to tell "he's uploading" from "he hasn't started".

### Checkpoint 5

- [ ] The calendar shows all scheduled shoots on correct dates, scoped per role
- [ ] The detail drawer shows per-item file counts and sizes from `raw_files`
- [ ] The Drive folder link opens the correct folder
- [ ] Pending shoots lists exactly those past end time with no raw
- [ ] In-progress uploads are visually distinct from not-started
- [ ] The 20 September Basil Café shoot from the seed appears in Pending
- [ ] Admin sees all six clients' shoots; Jaspreet sees only her two clients'

---

## Step 6 — Arrival and status

### What to do

The wrapper tells us the moment a file completes, so status is known rather than inferred.

When every `shoot_items` row on a shoot has at least one `raw_files` row, transition the shoot to `raw_uploaded` and its linked items through `transition()`. Notify the brand manager and assigned editor.

Keep a **backstop poll** at low frequency — hourly is enough — using `changes.list` against the stored `page_token`, catching files someone dropped into Drive directly from a desktop. Persist the returned `newStartPageToken` immediately; losing it forces a full resync. Make it idempotent: a file already recorded from the wrapper must not create a second `raw_files` row or a second transition.

### Checkpoint 6

- [ ] Completing uploads for all ideas on a shoot transitions it to `raw_uploaded` with logs
- [ ] A shoot with two of three ideas uploaded does not yet transition
- [ ] The brand manager and assigned editor are notified on arrival
- [ ] Dropping a file directly into a Drive subfolder is picked up by the backstop poll within an hour
- [ ] A file already recorded by the wrapper is not duplicated by the poll
- [ ] `page_token` advances on every run and survives a crash mid-run
- [ ] Calling the cron endpoint without `CRON_SECRET` returns 401

---

## Step 7 — Editor raw access

### What to do

Editors pull tens of gigabytes. Do not proxy it.

Each assigned edit shows the shoot's `raw_files` with names and sizes, each opening its Drive link, plus a link to the whole idea subfolder. Editors with Drive for Desktop get the folder mounted; everyone else downloads from Drive's web UI.

This requires the editor to have read access to the Shared Drive — unlike cameramen, who need no Google access at all. Document that distinction clearly; it is easy to get wrong during onboarding.

**Update the prototype's copy** — "Open raw footage in Drive" stays accurate for editors.

### Checkpoint 7

- [ ] The file list matches `raw_files` for that shoot with correct names and sizes
- [ ] Each file's Drive link opens for an editor with Shared Drive access
- [ ] The folder link opens the correct idea subfolder
- [ ] An editor without Drive access sees a clear message naming what they need
- [ ] An editor requesting raw for an unassigned shoot receives 403

---

## Step 8 — Manual override and reconciliation

### What to do

Keep Mark raw uploaded for footage that reached Drive outside the wrapper. Record whether a transition came from the wrapper, the backstop poll or a person.

Add a reconciliation view on the admin calendar: shoots where the manual mark and actual `raw_files` disagree, plus stalled `active` upload sessions with no progress for over 24 hours.

### Checkpoint 8

- [ ] Manual marking works and logs with `actor_type = 'user'`
- [ ] A shoot marked manually and later completed by the wrapper does not double-transition
- [ ] Reconciliation lists disagreements and is empty when everything agrees
- [ ] A shoot marked uploaded with zero `raw_files` appears in reconciliation
- [ ] Sessions stalled over 24 hours are flagged

---

## Self-Audit Instruction

Before declaring this phase complete, you must:

1. Re-read every checkpoint in this phase file
2. Test each one for real — upload multi-gigabyte files through the actual wrapper, close the tab mid-upload, resume the next day. Step 3 cannot be verified by reading code.
3. Return a structured report:
   ✅ [Checkpoint] — Pass
   ⚠️ [Checkpoint] — Partial: [specific reason]
   ❌ [Checkpoint] — Fail: [specific reason]
4. Fix all failures and partials before reporting phase complete.
5. Only say "Phase 4 Complete" when every checkbox is green.
6. Update `docs/progress.md` with what was built, deviations, and anything carried into Phase 5.

## Final Phase 4 Checklist

- [ ] Shoot scheduling live with true many-to-many item linking
- [ ] Drive folder trees provisioned automatically, with failure and retry handled
- [ ] Upload wrapper live: multi-file queue, chunked direct-to-Google, resume as a first-class feature
- [ ] Cameraman calendar showing real arrival and in-progress state
- [ ] Manager and admin calendars scoped, with pending shoots
- [ ] Status driven by upload completion, with an hourly backstop poll
- [ ] Editor raw access via Drive links, with access requirements documented
- [ ] Manual override retained and reconciliation view built
- [ ] Self-audit passed with all green
- [ ] `docs/progress.md` updated
