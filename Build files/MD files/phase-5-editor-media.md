# Phase 5 — Editor Pipeline & Media

## Objective

Close the loop from raw footage to a watchable cut. Brand managers assign edits, editors work their queues, cuts upload directly to Backblaze B2 as versioned records, and the app streams them with working timestamp scrubbing.

## Context

Phase 4 delivers raw footage landed in Drive through the upload wrapper, registered in `raw_files`, with items at `raw_uploaded` and editor raw access already built (per-file and folder Drive links). Phase 0 verified B2 presigned upload, download and ranged requests, leaving `lib/b2/presign.ts` in place.

Scrubbing is not cosmetic — Phase 6's entire review model is timestamped comments. If seeking is broken, the next phase is unbuildable.

---

## Step 1 — Assignment

### What to do

In the Editors' den, a brand manager assigns an item at `raw_uploaded` to an editor with a deadline. This sets `assigned_editor_id` and transitions to `with_editor`.

Show each editor's current load — items at `with_editor` — beside their name, since the brief says managers pick "whichever is more free at the moment".

Support reassignment, which logs both the old and new editor.

### Checkpoint 1

- [ ] Assigning sets `assigned_editor_id`, `deadline`, and transitions to `with_editor` with a log row
- [ ] Only users with role `editor` appear in the selector
- [ ] Current load counts match a hand-run SQL query
- [ ] Reassigning logs both editors in the activity metadata
- [ ] Assigning an item not at `raw_uploaded` or `changes_requested` is rejected
- [ ] A brand manager assigning another manager's item receives 403

---

## Step 2 — Editor queues

### What to do

Wire `/editor/todo` and `/editor/redo`, scoped strictly to the signed-in editor. To-do holds `with_editor` items never previously submitted; Re-do holds items returned via `changes_requested`. Both order by deadline, soonest first, with urgency tags for overdue and due-today.

To-do detail shows concept, script, instructions, reference links, and the raw footage panel built in Phase 4 Step 7 — the file list with Drive links and a link to the whole idea subfolder.

Re-do detail additionally shows old and new instructions side by side, the previous cut with its version number, and the change requests against it.

### Checkpoint 2

- [ ] Signed in as Rohit, only his assignments appear; Simran's do not
- [ ] An item is in exactly one queue at a time, never both
- [ ] Ordering is by deadline ascending, with overdue items tagged
- [ ] The raw footage panel lists that shoot's real files and the Drive links open correctly
- [ ] Re-do detail shows both instruction sets and the previous version number
- [ ] An item with no linked shoot shows a clear "Raw not available" state instead of a broken link

---

## Step 3 — Cut upload

### What to do

Build presigned multipart upload direct from browser to B2 — never through the server, which caps at roughly 4.5MB.

The flow: client requests a presigned multipart URL from an authorized route, uploads parts with real progress, completes the upload, then notifies the server which writes a `deliverable_versions` row with the next version number and transitions the item to `cut_submitted`.

Validate client-side before upload starts: MP4 only, under 200MB. State the export spec plainly on screen — H.264, AAC, faststart, under 200MB. Handle failure mid-upload with a retry that does not orphan the multipart session.

Version numbers increment per content item, never globally.

### Checkpoint 3

- [ ] A 120MB file uploads successfully with accurate progress
- [ ] Bytes never pass through the Next.js server, confirmed in the Network tab
- [ ] A 250MB file is rejected client-side before any upload begins
- [ ] A non-MP4 file is rejected with a message naming the required format
- [ ] Completion writes `deliverable_versions` with the correct incrementing version and transitions to `cut_submitted`
- [ ] A second cut for the same item becomes version 2, not version 1
- [ ] Cancelling mid-upload aborts the multipart session, leaving no orphaned parts in the bucket
- [ ] An editor uploading against another editor's item receives 403

---

## Step 4 — Version history

### What to do

Expose version history on any item with more than one cut: version number, uploader, upload time, file size, duration, and the status that version reached. Any version stays playable, so a manager can compare v2 against v3.

Only the latest version is the active one for approval; earlier versions are read-only.

### Checkpoint 4

- [ ] An item with 3 versions lists all 3 with correct metadata
- [ ] Every version plays, including superseded ones
- [ ] Approval actions target only the latest version
- [ ] The seeded three-version item renders its full history correctly

---

## Step 5 — Streaming player

### What to do

Build the player used in the Editors' den and re-do detail. Playback uses a short-lived presigned GET URL, generated per request and never stored in markup.

**Seeking must work.** Verify ranged requests return 206. Add a visible warning when a file's `moov` atom is at the end, making scrubbing unreliable — that is the export spec being ignored and the editor needs to know.

Standard controls, keyboard accessible, with the current timestamp displayed in a format matching the comment format Phase 6 will use.

### Checkpoint 5

- [ ] A cut plays in the den from a presigned URL
- [ ] Clicking anywhere on the scrub bar seeks accurately, including backwards
- [ ] Ranged requests return 206, confirmed in the Network tab
- [ ] The presigned URL expires and a page refresh issues a fresh one
- [ ] The raw B2 object URL without a signature returns 403
- [ ] Current time displays as `0:11`, matching the comment timestamp format
- [ ] Space, arrow keys and Escape work; the player is reachable by tab
- [ ] A file with a trailing `moov` atom triggers the warning

---

## Step 6 — Library

### What to do

Wire `/editor/library` to `library_assets`: per-client folders of reusable B-roll, logo stings and music beds, with item counts and last-updated dates. Upload goes to B2 by the same presigned route with a different key prefix.

Editors see libraries for clients they have assignments on. Admins see all.

### Checkpoint 6

- [ ] Folder grid shows real counts and last-updated dates
- [ ] Uploading an asset stores it in B2 and lists it immediately
- [ ] An editor sees only libraries for clients they have work on
- [ ] Downloading an asset uses a presigned URL that expires

---

## Self-Audit Instruction

Before declaring this phase complete, you must:

1. Re-read every checkpoint in this phase file
2. Test each one for real — upload an actual video file and scrub it. Step 5 cannot be verified by reading code.
3. Return a structured report:
   ✅ [Checkpoint] — Pass
   ⚠️ [Checkpoint] — Partial: [specific reason]
   ❌ [Checkpoint] — Fail: [specific reason]
4. Fix all failures and partials before reporting phase complete.
5. Only say "Phase 5 Complete" when every checkbox is green.
6. Update `docs/progress.md` with what was built, deviations, and anything carried into Phase 6.

## Final Phase 5 Checklist

- [ ] Assignment working with editor load visible
- [ ] Both editor queues scoped, ordered and populated correctly
- [ ] Direct-to-B2 multipart upload with validation, progress and safe cancellation
- [ ] Versions increment per item with full history playable
- [ ] Player streams from presigned URLs with verified 206 seeking
- [ ] Library live for reusable assets
- [ ] Self-audit passed with all green
- [ ] `docs/progress.md` updated
