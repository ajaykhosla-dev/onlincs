# Phase 9 — Owner Analytics

## Objective

Answer the owner's real question: who is actually delivering. Scope of work versus delivered per client, throughput and turnaround per team member, and revision counts that show where work is going back and forth — all computed from the activity trail written since Phase 0.

## Context

Every status transition since Phase 3 has written an `activity_log` row with actor, from-state, to-state and timestamp. That history is the entire input to this phase, which is why it was built before there was anything to report on.

From the brief, the owner's stated pain is having "no clear proof of who did most of the work silently." This phase is the answer to that sentence.

---

## Step 1 — Aggregation layer

### What to do

Build `lib/analytics/` with query functions computing, for a given agency, month and optional client or member:

- **Scope delivered** — items at `posted` in the month over the `client_scope` total
- **Throughput** — items each member moved forward, by role-relevant transition: cameramen by shoots completed, editors by cuts submitted, brand managers by items shipped to posted
- **Turnaround** — median hours between key transitions: `raw_uploaded → cut_submitted` for editors, `cut_submitted → internally_approved` for managers, `with_client → client_approved` for clients
- **Revision rate** — average `changes_requested` events per delivered item, per editor
- **On-time rate** — deliverables posted on or before their scheduled time
- **First-pass approval rate** — cuts approved at v1 with no revisions

Use medians, not means. One catastrophic outlier should not make a good editor look slow.

Cache expensive aggregations for 15 minutes; these numbers do not need to be live.

### Checkpoint 1

- [ ] Every metric returns a number for the seeded September data
- [ ] Each metric is verified against a hand-written SQL query run separately — matching to the row
- [ ] Turnaround uses medians, confirmed by adding one extreme outlier and seeing the figure barely move
- [ ] Filtering by client, by member and by month each narrow correctly
- [ ] A member with no activity returns zero rather than null or an error
- [ ] Aggregations complete in under 500ms on the seeded dataset

---

## Step 2 — Team screen

### What to do

Wire `/admin/team`: a row per member showing role, assigned clients, items delivered this month, revision rate, median turnaround and on-time rate, with three metric cards above for agency-wide throughput, median turnaround and on-time rate.

Sortable by any column. Month selector. Clicking a member opens their detail: their activity over time, their clients, and their current open work.

**Present this as workload and flow, not a leaderboard.** A cameraman and an editor do incomparable work, and ranking them against each other produces a number that means nothing and a conversation that helps nobody. Group by role.

### Checkpoint 2

- [ ] All 8 members appear with metrics matching the aggregation layer
- [ ] Members are grouped by role, not ranked in a single list
- [ ] Sorting works on every column
- [ ] The month selector reloads the correct period
- [ ] Member detail shows their activity, clients and open work
- [ ] A member with no activity this month renders cleanly with zeros
- [ ] Only admin and platform_owner can reach this screen; a brand manager gets 403

---

## Step 3 — Scope of work vs delivered

### What to do

Build the SoW view: per client, contracted versus delivered for the month, broken down by content type where scope specifies it — reels, posts, carousels, stories.

Show pace, not just totals. "9 of 12 with 7 days left" tells the owner something; "9/12" does not. Flag clients tracking behind the pace needed to finish the month.

Add a month-over-month trend for the last six months so a decline is visible before it becomes a lost client.

### Checkpoint 3

- [ ] Contracted versus delivered matches `client_scope` and posted counts for all six clients
- [ ] The type breakdown sums to the totals
- [ ] Pace flags clients behind schedule — Sandhu Interiors at 6/16 must be flagged
- [ ] Grover Motors at 20/20 shows as complete
- [ ] Verdant Gym at 0/10 shows as onboarding, not as failing
- [ ] The six-month trend renders for a client with history

---

## Step 4 — Wire the metric cards

### What to do

Replace the placeholder metric cards across the admin and manager screens with real figures: active clients, waiting on approval, past deadline, plus the counts already surfaced in Phase 7 and Phase 8.

Every card's number must be clickable, filtering the screen below to exactly the rows it counts. A number you cannot drill into is decoration.

### Checkpoint 4

- [ ] Every metric card across all screens shows a real computed number
- [ ] Clicking a card filters the view below to exactly those records
- [ ] The filtered row count equals the number on the card
- [ ] Manager cards reflect only that manager's clients
- [ ] Cards refresh after an action that changes their count

---

## Step 5 — Export

### What to do

Wire the Export data button: the current view's data as CSV, respecting active filters and the user's permission scope. A brand manager's export contains only their clients.

Include a monthly client report export — scope, delivered, turnaround and revision counts — that Ashmeet can send a client directly.

### Checkpoint 5

- [ ] Export produces a CSV matching the on-screen rows exactly
- [ ] Active filters are respected in the output
- [ ] A brand manager's export contains none of another manager's clients
- [ ] The monthly client report contains the right sections and opens cleanly in Excel
- [ ] Every export writes an `activity_log` row

---

## Self-Audit Instruction

Before declaring this phase complete, you must:

1. Re-read every checkpoint in this phase file
2. Test each one for real — verify every metric against an independently written SQL query. A plausible-looking wrong number is the main risk in this phase.
3. Return a structured report:
   ✅ [Checkpoint] — Pass
   ⚠️ [Checkpoint] — Partial: [specific reason]
   ❌ [Checkpoint] — Fail: [specific reason]
4. Fix all failures and partials before reporting phase complete.
5. Only say "Phase 9 Complete" when every checkbox is green.
6. Update `docs/progress.md` with what was built, deviations, and anything carried into Phase 10.

## Final Phase 9 Checklist

- [ ] Aggregation layer built, cached and verified against independent SQL
- [ ] Team screen live, grouped by role rather than ranked
- [ ] Scope versus delivered with pace flagging and a six-month trend
- [ ] Every metric card showing real numbers and drilling through
- [ ] Permission-scoped CSV export and a client-ready monthly report
- [ ] Self-audit passed with all green
- [ ] `docs/progress.md` updated
