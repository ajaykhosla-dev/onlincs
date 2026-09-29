# Phase 6 — Review & Approval

## Objective

Kill the WhatsApp feedback loop. Brand managers leave timestamped comments and voice notes on a cut, approve it or send it back, and then share a single magic link with the client who approves or requests changes without ever creating an account.

## Context

Phase 5 delivers playable versioned cuts with working scrubbing. `approval_links` exists in the schema with token and PIN hash columns. `comments` supports timestamps, voice notes and transcripts.

Two approval levels exist: the monthly calendar (`monthly_plans`, built in Phase 3) and the individual cut (this phase). The client portal is deliberately minimal — one page, one deliverable, no login, no dashboard.

---

## Step 1 — Timestamped comments

### What to do

Build the comments panel beside the player. Adding a comment captures the player's current time as `timestamp_start`, optionally a range end, and the body. Comments display as `0:11–0:14` and clicking one seeks the player to that point.

Comments attach to a specific `deliverable_versions` row, not to the content item — v2's feedback must not appear on v3.

Support edit and delete by the author, and mark each comment resolved or unresolved.

### Checkpoint 1

- [ ] Adding a comment captures the exact playhead position, verified against the displayed time
- [ ] Clicking a comment seeks the player to that timestamp
- [ ] A range comment renders as `0:11–0:14`
- [ ] Comments on v2 do not appear when viewing v3
- [ ] An author can edit and delete their own comment; another user cannot
- [ ] Resolved comments are visually distinct and filterable

---

## Step 2 — Voice notes

### What to do

Record voice notes in-browser via MediaRecorder, capped at 2 minutes, uploaded to B2 by presigned URL and attached to a comment as `voice_note_key`.

On upload, send the audio for transcription and store the result in `transcript`. Display the transcript beneath the player — **this is the single AI touchpoint in the product**, and it exists because the editor's stated pain is unclear directions.

Transcription failing must not fail the comment. The voice note stays playable with the transcript marked unavailable and a retry option.

### Checkpoint 2

- [ ] Recording, playing back and saving a voice note works end to end
- [ ] Recording stops automatically at 2 minutes
- [ ] The audio file lands in B2 and plays from a presigned URL
- [ ] A transcript appears beneath the voice note within a reasonable delay
- [ ] Forcing a transcription failure leaves the voice note playable with a retry available
- [ ] A browser denying microphone permission shows a clear message, not a crash
- [ ] The seeded voice note comment renders with its transcript

---

## Step 3 — Internal review

### What to do

Wire Approve and Send changes in the Editors' den.

Send changes requires at least one unresolved comment, transitions the version to `changes_requested` and the item to `changes_requested`, which places it in the editor's Re-do queue with the comments visible.

Approve transitions the version to `internally_approved` and the item to `internally_approved`, making it eligible to send to the client.

### Checkpoint 3

- [ ] Send changes with no comments is blocked with an explanatory message
- [ ] Send changes moves the item into the assigned editor's Re-do queue immediately
- [ ] The editor sees all unresolved comments with timestamps and voice notes
- [ ] Approve transitions both version and item, and the item becomes eligible to send
- [ ] An editor attempting either action receives 403
- [ ] Both actions write `activity_log` rows

---

## Step 4 — Magic link generation

### What to do

Generate a client approval link from an `internally_approved` item. Create a 32-byte cryptographically random token and a 4-digit PIN, **store only their hashes**, set a 7-day expiry, and return the raw values exactly once for the manager to copy.

The link is scoped to one version of one content item. Never to a client, never to an account.

Provide revoke, and support regeneration, which revokes the previous link.

Sending transitions the item to `with_client`.

### Checkpoint 4

- [ ] Generating returns the URL and PIN once; reopening shows only that a link is active, never the values again
- [ ] `approval_links` stores hashes — the plaintext token and PIN appear nowhere in the database
- [ ] The link is scoped to one version; a newer version does not inherit it
- [ ] Revoking makes the link stop working immediately
- [ ] Regenerating revokes the prior link
- [ ] Generating from an item not at `internally_approved` is rejected
- [ ] Sending transitions the item to `with_client`

---

## Step 5 — Client approval page

### What to do

Build `/approve/[token]` — public, no session, mobile-first, since clients open these on phones.

Flow: token resolves, PIN prompt, then the page shows the client's brand name, the idea title, the video player and two actions — Approve, or Request changes with a free-text box. No navigation, no other content, no data about other deliverables.

Handle every failure state distinctly: invalid token, expired, revoked, already responded. Rate-limit PIN attempts and lock after five failures.

Log every view with IP and user agent, and set `viewed_at` on first view.

### Checkpoint 5

- [ ] A valid link with the correct PIN shows the video and both actions
- [ ] The video plays and seeks on a real mobile device
- [ ] A wrong PIN is rejected; five failures lock the link
- [ ] Expired, revoked, invalid and already-responded each render distinct messages
- [ ] The page exposes nothing about other clients, deliverables or the agency's internals
- [ ] `viewed_at` sets on first view and the view is logged with IP and user agent
- [ ] The page is usable at 390px with no horizontal scroll
- [ ] Guessing a token by brute force is infeasible — confirm token entropy is 32 bytes

---

## Step 6 — Client response

### What to do

Approve sets `response = 'approved'`, `responded_at`, transitions the version to `client_approved` and the item to `client_approved`, and logs with `actor_type = 'client'`.

Request changes stores the text as a `comments` row with `source = 'client'`, transitions the item to `client_changes`, and returns it to the editor's Re-do queue with the client's words shown verbatim — never paraphrased or summarised.

After responding, the link stops accepting further responses and shows a confirmation.

**An item that has already been client-approved can still receive a later change request** — the brief calls this out explicitly. Support re-entry into the revision loop from `client_approved`.

### Checkpoint 6

- [ ] Approving transitions both version and item and logs with `actor_type = 'client'`
- [ ] Requesting changes creates a `comments` row with `source = 'client'` and the exact text
- [ ] The item returns to the editor's Re-do queue with the client's words visible verbatim
- [ ] Responding twice is blocked; the second attempt shows the confirmation state
- [ ] A brand manager is notified in-app of the response
- [ ] An already `client_approved` item can be reopened into `client_changes` by an authorized user
- [ ] The seeded expired, revoked and responded links each behave correctly

---

## Self-Audit Instruction

Before declaring this phase complete, you must:

1. Re-read every checkpoint in this phase file
2. Test each one for real — open a magic link on an actual phone, on a network with no session, and complete both response paths
3. Return a structured report:
   ✅ [Checkpoint] — Pass
   ⚠️ [Checkpoint] — Partial: [specific reason]
   ❌ [Checkpoint] — Fail: [specific reason]
4. Fix all failures and partials before reporting phase complete.
5. Only say "Phase 6 Complete" when every checkbox is green.
6. Update `docs/progress.md` with what was built, deviations, and anything carried into Phase 7.

## Final Phase 6 Checklist

- [ ] Timestamped comments bound to versions, seeking on click
- [ ] Voice notes recording, storing and transcribing, with graceful failure
- [ ] Internal approve and send-changes driving the revision loop
- [ ] Magic links generated with hashed token and PIN, expiry and revocation
- [ ] Client page live, mobile-first, exposing nothing beyond one deliverable
- [ ] Client responses transitioning correctly with verbatim feedback preserved
- [ ] Self-audit passed with all green
- [ ] `docs/progress.md` updated
