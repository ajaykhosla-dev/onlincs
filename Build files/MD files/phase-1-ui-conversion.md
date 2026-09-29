# Phase 1 — UI Conversion

## Objective

Port the five approved HTML prototypes into the Next.js application as React components and routes, rendering from static fixture data. No backend wiring, no authentication, no database reads.

The bar is visual identity. A reviewer switching between the prototype and the running app on the same screen should not be able to tell which is which.

## Context

Phase 0 delivered a running Next.js app, `styles/theme.css` imported globally with its tokens mirrored into Tailwind, Plus Jakarta Sans loaded, and empty route groups for each role. The database exists and is seeded, but **this phase does not read from it** — keeping data static isolates visual regressions from data bugs.

The prototypes in `ui-prototypes/` are the specification. If a component looks different from the prototype, the component is wrong, not the prototype. Do not redesign, "improve", modernise or tidy anything. Report mismatches you believe are prototype bugs rather than silently fixing them.

Screens to convert, by role:

- **Admin** — clients · calendar · den · posting · planner · team · settings
- **Brand Manager** — clients · calendar · den · posting · planner
- **Editor** — todo · redo · library
- **Cameraman** — shoots (calendar) · pending
- **Login**

---

## Step 1 — Shared primitives

### What to do

Read all five prototypes end to end before writing any component. Identify the markup and CSS classes repeated across files and build those once in `components/shared/`:

- `Rail` — the violet gradient sidebar with the bowed right edge (`border-radius: 0 78px 78px 0 / 0 48% 48% 0`), vertically centred icon stack, tooltips, active state, Settings behind a hairline divider. Takes a nav-item array and an active key.
- `TopNav` — text tabs with active underline, search pill, Light/Dark segment, bell with dot, gear, soft pill button, dark gradient primary button. All slots optional, since Editor and Cameraman use a reduced version.
- `MetricCard` — gradient icon tile, badge pill, value, label, note. Variants violet / amber / pink.
- `FilterStrip` — pill selects, Reset link, Apply button
- `DataTable` — borderless, `border-spacing: 0 4px`, rounded row hover. Accepts column definitions and rows.
- `Tag` — pastel status pill, variants grey / violet / amber / pink / mint / sky
- `Avatar` — gradient initials tile, square and circular variants
- `ProgressBar` — thin gradient fill with warn and done variants
- `SlideOver` — right panel over a dimmed backdrop; closes on ×, Escape and backdrop click; traps and restores focus
- `Modal`, `EmptyState`, `Pager`

Every component takes props and holds no data. Use the existing class names from `theme.css` — do not rewrite the CSS as Tailwind utilities. Tailwind is available for new layout only.

### Checkpoint 1

- [ ] All 12 primitives exist in `components/shared/` with typed props and no hardcoded content
- [ ] A Storybook-style scratch route renders every component in every variant
- [ ] `Rail` renders identically to the prototype at 1440px, 1024px and 390px — compared side by side in a browser
- [ ] `SlideOver` closes on all three interactions and returns focus to the trigger
- [ ] No component contains literal client names, dates or numbers

---

## Step 2 — Fixture data

### What to do

Create `lib/fixtures/` exporting typed static data matching the canonical values in `docs/context.md`: the 8 team members, 6 clients with their codes, handles, niches, managers, SoW and delivered counts, the 10 named content ideas, and the shoot schedule for 21–27 September 2026.

Type these against `types/database.ts` from Phase 0, so Phase 3 onward can swap a fixture import for a query with no component changes.

Include the problem states the prototypes display: the 6-days-late Diwali reel, the missing raw from 20 September, Verdant Gym at zero, Grover at 100%.

### Checkpoint 2

- [ ] Fixtures typecheck against the Phase 0 generated database types
- [ ] Client codes, handles, niches, managers, SoW and delivered counts match context.md exactly
- [ ] No component defines its own inline data — verified by grepping components for "Ramana"
- [ ] The full 21–27 September shoot schedule is present with start and end times

---

## Step 3 — Login route

### What to do

Convert `login.html` into `app/(auth)/login/page.tsx`. Split layout, violet gradient panel with the RapidArc AI wordmark and three value rows, sign-in card with the Google button, access note and support link, "Built by RapidArc AI" footer.

The Google button is non-functional in this phase — it renders and is focusable, nothing more.

### Checkpoint 3

- [ ] `/login` matches `login.html` side by side at 1440px and 390px
- [ ] The value list collapses below 900px exactly as the prototype does
- [ ] The Google mark SVG renders with its four original colours
- [ ] No password field, no signup link

---

## Step 4 — Admin screens

### What to do

Build `app/(admin)/layout.tsx` with `Rail` and `TopNav`, then seven routes: `/admin/clients`, `/calendar`, `/den`, `/posting`, `/planner`, `/team`, `/settings`. Each corresponds to a `data-screen` section in `admin.html`.

Replace the prototype's JS show/hide switching with real Next.js routing — one URL per screen. The rail sets active state from the pathname.

Port every interaction the prototype has: the calendar shoot drawer, the den review screen with its timestamped comments panel and voice note, the planner's calendar/list toggle and Plan modal, the posting schedule day panel, the Team table, the Settings storage bar.

Video players and images stay as styled placeholders.

### Checkpoint 4

- [ ] All seven routes render and are reachable by clicking the rail
- [ ] Each screen matches its prototype section side by side at 1440px
- [ ] The rail's active state follows the URL, and a hard refresh preserves it
- [ ] The den review screen shows timestamped comments including the voice note with transcript
- [ ] The planner Plan modal opens with all nine fields and closes on Escape
- [ ] The planner calendar/list toggle switches views
- [ ] Browser back and forward move between screens correctly
- [ ] No console errors or React key warnings on any route

---

## Step 5 — Brand Manager screens

### What to do

Build `app/(manager)/` with five routes: clients, calendar, den, posting, planner. Reuse the Admin components — these screens differ by data scope and by the absence of Team and Settings, not by design.

Scope fixtures to Jaspreet Kaur, so only Ramana Dental and Grover Motors appear anywhere. Include the "Schedule a shoot" modal on the calendar with its Date, Time, Client, Cameraman and multi-select of content ideas.

### Checkpoint 5

- [ ] All five routes render; no Team or Settings route exists in this group
- [ ] Only Ramana Dental and Grover Motors appear on every screen — grep the rendered output for the other four client names and find nothing
- [ ] The Schedule a shoot modal opens with all five fields, the idea field allowing multiple selections
- [ ] Shared components are genuinely reused — no duplicated table or card implementations between `(admin)` and `(manager)`

---

## Step 6 — Editor screens

### What to do

Build `app/(editor)/` with three routes: todo, redo, library. Reduced chrome — three-item rail, and a TopNav with only search, bell and the Light/Dark segment.

To-do detail shows the brief, an Open raw footage in Drive button and the upload area with the export spec stated. Re-do detail shows old and new instructions side by side, the previous cut with its version number, and the change requests including the voice note.

### Checkpoint 6

- [ ] Three routes render with the reduced rail and TopNav
- [ ] To-do detail shows the export spec as literal text — H.264, under 200MB, faststart
- [ ] Re-do detail shows old and new instructions side by side, both populated and distinguishable
- [ ] The library folder grid shows item counts and last-updated dates
- [ ] Deadline urgency tags use the correct Tag variants

---

## Step 7 — Cameraman screens

### What to do

Build `app/(cameraman)/` with two routes: shoots and pending. **This is the screen most likely to regress — it is calendar-first by deliberate correction, and the temptation to simplify it back into a list must be resisted.**

Port the full calendar: mini month sidebar with navigation and shoot dots, Today button with prev/next, Day/Week toggle, the hour-row time grid from 6 AM to 9 PM, events absolutely positioned by start time and duration, the current-time line at 4:20 PM on 23 September, and completed versus upcoming event styling.

Week is the default view. Day view on 23 September shows the empty state with the next shoot called out.

The shoot detail slide-out carries the per-idea blocks with concept, script, reference link, an Upload footage button and the Mark raw uploaded toggle. Keep the offline banner.

Note: in the approved HTML the upload button deep-links to Drive. It now opens our own upload wrapper instead. Keep the label and placement; only the destination changes.

Mobile: horizontal date strip, expandable month, detail as a bottom sheet, two-item bottom tab bar.

### Checkpoint 7

- [ ] Week view is the default and all four events sit in the correct hour slots, verified against the times in the prototype
- [ ] Events are positioned by start time and duration, not stacked in order — a 90-minute event is visibly taller than a 60-minute one
- [ ] Mini calendar navigates months; clicking a date moves the grid
- [ ] Today button returns to 23 September from any date
- [ ] Day view on 23 September shows the empty state, not a blank grid
- [ ] The current-time line appears only on 23 September, at 4:20 PM
- [ ] Clicking each event opens the slide-out with that shoot's own ideas
- [ ] At 390px: date strip works, detail opens as a bottom sheet, no horizontal scroll, no text under 15px
- [ ] Pending uploads renders and its count matches the calendar's missing-raw shoot

---

## Step 8 — Parity and accessibility pass

### What to do

Open each prototype and its converted route side by side at 1440px, 1024px and 390px. Note every visual difference and fix it. Check specifically: rail gradient and curve, card shadows, border radii, font weights, tag colours, table row spacing, button heights.

Then verify accessibility across all 18 routes: `aria-label` on every icon-only button, `aria-current` on active nav, visible focus rings, colour never the sole carrier of meaning, `prefers-reduced-motion` respected.

Confirm no browser storage APIs and no network requests beyond Google Fonts.

### Checkpoint 8

- [ ] Every route compared side by side at all three widths with no unexplained differences
- [ ] `grep -ri "localStorage\|sessionStorage" app/ components/` returns nothing
- [ ] Every icon-only button has an `aria-label`
- [ ] Tab order is logical on all 18 routes and focus is always visible
- [ ] Every status colour is paired with text
- [ ] `npm run build` completes with no errors or warnings
- [ ] Lighthouse accessibility scores 95 or above on one route per role

---

## Self-Audit Instruction

Before declaring this phase complete, you must:

1. Re-read every checkpoint in this phase file
2. Test each one for real — open the route, click the control, compare against the prototype in a second window. Visual checkpoints require actually looking, not reasoning about the code.
3. Return a structured report:
   ✅ [Checkpoint] — Pass
   ⚠️ [Checkpoint] — Partial: [specific reason]
   ❌ [Checkpoint] — Fail: [specific reason]
4. Fix all failures and partials before reporting phase complete.
5. Only say "Phase 1 Complete" when every checkbox is green.
6. Update `docs/progress.md`: mark Phase 1 done with the date, log what was built, record any deviation from the prototypes and why, and list anything carried into Phase 2.

## Final Phase 1 Checklist

- [ ] 12 shared primitives built, typed and data-free
- [ ] Fixtures typed against the database schema and matching context.md
- [ ] All 18 routes exist, render and are reachable by navigation
- [ ] Every screen visually matches its prototype at three breakpoints
- [ ] Brand Manager scoped to Jaspreet's two clients with no leakage
- [ ] Cameraman calendar is calendar-first with correctly positioned events
- [ ] No backend calls, no auth, no browser storage
- [ ] Accessibility pass complete across all routes
- [ ] Self-audit passed with all green
- [ ] `docs/progress.md` updated
- [ ] Client sign-off received on the running app, not the prototypes
