# Phase 7 — Posting Schedule

## Objective

Complete the pipeline's last leg. A client-approved cut gets a publish date and time, a caption and a background music reference, appears on the posting schedule, and is marked posted once it goes out — which is what finally counts toward scope delivered.

## Context

Phase 6 delivers items reaching `client_approved`. `post_schedule` exists in the schema with `scheduled_at`, `caption`, `bg_music_ref`, `posted_at` and `posted_by`.

The system does not publish to Instagram — that is deferred to v2 and out of the current scope of work. A person posts manually and marks it done here.

---

## Step 1 — Scheduling a post

### What to do

From a `client_approved` item, schedule a post: date and time, caption, and a background music reference. Writes a `post_schedule` row and transitions the item to `scheduled`.

Captions need real room — a multi-line field with a character count, since Instagram captions run long. Support editing a scheduled post's time and caption before it goes out.

Warn when scheduling two posts for the same client within an hour of each other, without blocking it.

### Checkpoint 1

- [ ] Scheduling writes a `post_schedule` row and transitions the item to `scheduled`
- [ ] Scheduling an item not at `client_approved` is rejected with a message naming its status
- [ ] The caption field accepts multi-line text over 2,000 characters and shows a count
- [ ] Editing time or caption before posting saves and re-renders
- [ ] Two posts for one client within an hour triggers a warning that can be dismissed
- [ ] Times store UTC and display IST

---

## Step 2 — The schedule grid

### What to do

Wire `/admin/posting` and `/manager/posting`, scoped by role. Month grid where each day shows its posts with time, client and format. Selecting a day opens the side panel listing each post with its caption, music reference and actions.

Sort each day chronologically. Posted and upcoming must be visually distinct, with the difference carried in text as well as colour.

### Checkpoint 2

- [ ] The grid shows all scheduled posts on their correct dates, scoped per role
- [ ] The day panel lists that day's posts in chronological order
- [ ] Captions render in full without truncating content the user needs
- [ ] Posted and upcoming are distinguishable by text, not colour alone
- [ ] Month navigation loads the correct month
- [ ] Jaspreet sees only her two clients' posts

---

## Step 3 — Download the final cut

### What to do

Downloading the approved cut is how the post actually gets published — someone pulls the file and uploads it to Instagram themselves.

Generate a short-lived presigned GET URL on demand with a sensible filename: `client-idea-name-v3.mp4`, not the raw B2 key. Serve the latest `client_approved` version. Log every download to `activity_log`.

### Checkpoint 3

- [ ] Download delivers the correct file with a readable filename
- [ ] The served version is the latest client-approved one, not an earlier draft
- [ ] The presigned URL expires; a stale URL returns 403
- [ ] Each download writes an `activity_log` row with the actor
- [ ] Download works on mobile Safari and Chrome

---

## Step 4 — Mark as posted

### What to do

Mark posted sets `posted_at` and `posted_by` and transitions the item to `posted`. This is the transition that increments scope delivered, so it must be accurate.

Support marking a past-dated post as posted, since people catch up after the fact. Support un-marking within 24 hours for mistakes, logging the reversal.

After posting, recompute that client's scope delivered for the month.

### Checkpoint 4

- [ ] Marking posted sets both fields and transitions to `posted` with a log row
- [ ] The client's scope delivered increases by exactly one
- [ ] A post dated three days ago can still be marked posted
- [ ] Un-marking within 24 hours reverts the status and logs the reversal
- [ ] Un-marking after 24 hours is blocked with an explanation
- [ ] Scope delivered matches a hand-run SQL count for all six clients

---

## Step 5 — Overdue and upcoming

### What to do

Add a due view: posts whose `scheduled_at` has passed with no `posted_at`, ordered oldest first with an overdue tag, plus today's and this week's upcoming posts.

Surface the overdue count on the posting screen and in the admin metric cards, so an unposted approved cut cannot sit quietly.

### Checkpoint 5

- [ ] Overdue lists exactly those past their scheduled time and unposted
- [ ] Ordering is oldest first with an overdue tag showing days late
- [ ] The overdue count matches the list length and appears on the metric card
- [ ] Marking one posted removes it from overdue immediately
- [ ] An empty overdue list shows an empty state, not a blank panel

---

## Self-Audit Instruction

Before declaring this phase complete, you must:

1. Re-read every checkpoint in this phase file
2. Test each one for real — schedule, download and mark a post, then verify scope delivered against SQL
3. Return a structured report:
   ✅ [Checkpoint] — Pass
   ⚠️ [Checkpoint] — Partial: [specific reason]
   ❌ [Checkpoint] — Fail: [specific reason]
4. Fix all failures and partials before reporting phase complete.
5. Only say "Phase 7 Complete" when every checkbox is green.
6. Update `docs/progress.md` with what was built, deviations, and anything carried into Phase 8.

## Final Phase 7 Checklist

- [ ] Scheduling live with caption and music reference, editable before posting
- [ ] Posting schedule grid and day panel wired and role-scoped
- [ ] Final cut download by presigned URL with readable filenames, logged
- [ ] Mark posted driving scope delivered accurately, with a 24-hour undo
- [ ] Overdue view surfacing unposted approved work
- [ ] The full pipeline now runs end to end: planned → posted
- [ ] Self-audit passed with all green
- [ ] `docs/progress.md` updated
