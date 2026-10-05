# Phase 7 posting schedule audit

Status (5 Oct 2026): migration `010_phase7_posting.sql` is applied live. Rollback-only database checks and the temporary live HTTP/Edge checks in `scripts/qa-phase6-7-live.mjs` pass. The posting screen's 390px horizontal overflow was fixed in `src/styles/theme.css` and `src/styles/screens/console-manager.css`; production build and browser recheck pass. A few device and interaction checks remain.

## What was built

- **Migration `010_phase7_posting.sql`** (additive): `post_schedule.updated_at`, a unique index (one post per item), and four service-role-only functions: `phase7_schedule_post`, `phase7_update_post`, `phase7_mark_posted`, `phase7_unmark_posted`. They are the only path to or from `scheduled` and `posted`. The generic status route and planner dropdown no longer offer those two states.
- **Scheduling** (`POST /api/posting`): only a `client_approved` item; any other status is rejected naming it ("This item is with editor"). Writes the `post_schedule` row, moves the item to `scheduled`, logs both. Captions up to 10,000 characters, multi-line, with a live count and a note past Instagram's 2,200. Times are stored as UTC instants and entered and shown in IST.
- **Editing** (`PATCH /api/posting/[id]`): time, caption and music, only before posting; logged with the old and new time.
- **Nearby warning** (`GET /api/posting/nearby`): same client within 60 minutes, shown in the form, dismissible, never blocks saving.
- **Schedule grid** (`/admin/posting`, `/manager/posting`, `LivePosting`): month navigation, chips with time, client and format, day panel in chronological order with the full caption (wrapped, never truncated) and music. Posted, upcoming and overdue are spelled out in text ("Posted 5 Oct 2026, 3:00 pm", "Upcoming", "Overdue · 3 days late") as well as colour. Managers see only their own clients; the banner lists them.
- **Download** (`GET /api/posting/[id]/download`): latest `client_approved` version, 5-minute presigned URL with `Content-Disposition` set to `client-idea-name-v3.mp4`, one `cut_downloaded` `activity_log` row per call.
- **Mark posted / undo** (`POST /api/posting/[id]/posted`): sets `posted_at` and `posted_by`, item to `posted`, logged. Past-dated posts are allowed. Undo works within 24 hours (logged as `post_unmarked`, `reversal: true`) and is blocked after, with an explanation. Scope delivered is derived live from items at `posted`, so it moves by exactly one with each mark and undo.
- **Overdue and upcoming**: unposted posts past their time, oldest first with days late; today and next 7 days; empty states. The count appears on the posting screen's metric card and as an "Overdue posts" card on the admin Clients page.

## Live verification and remaining checks

1. Migration 010 exists live; `node --env-file=.env.local scripts/verify-phase7-migration.mjs` passed its rollback-only checks on 5 Oct 2026.
2. Temporary live records passed scheduling only from `client_approved`, a clear rejection for `client_changes`, a multiline caption over 2,000 characters, overdue and manager-scoped grid API data, nearby-post warning data, editing time/caption/music, and real B2 final-cut ranged download with attachment filename. Headless Edge at 390px showed the manager posting screen and live overdue post with no horizontal overflow after the CSS fix. Selecting the post's calendar day displayed the full long caption without overflow.
3. Mark posted increased delivered by one, cleared overdue, and undo restored the scheduled state and delivered count. Undo after 25 hours returned 409. The `/api/clients` delivered values matched hand-run SQL for every client in the agency during the test.
4. Still check form interactions (nearby warning display/dismissal, edit and posted controls) in a real browser session. Check the final-cut download on a physical phone, and the B2 URL's actual expiry after five minutes. Safari/Chrome phone behavior was not exercised here.

## Deviations

- Scope delivered counts by the item's planned month (unchanged Phase 3 rule), not the month it was posted.
- `posted_at` records when it was marked, not the scheduled time, so catching up on a past post is accurate.
- The seeded `post_schedule` rows keep whatever status their items have; the grid shows them regardless, but Mark posted only works for items at `scheduled`.
- The admin metric card is on the Clients page (the admin landing page). The Team page cards are still Phase 9 fixtures.
