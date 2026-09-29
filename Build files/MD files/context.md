# context.md — What we're building

## The problem

Ashmeet Chaurasia runs a social media marketing agency in Ludhiana with 5–6 clients and a team of editors, cameramen and brand managers. Everything runs through WhatsApp threads and four or five Google Sheets nobody updates. Raw footage gets lost. Deadlines slip. Shoots get redone because nobody knows a clip already exists. The owner cannot tell who on the team is actually delivering.

The sheets didn't fail because sheets are bad. They failed because nothing pulled the team back to them. That is the real design constraint: **the system must show state without anyone being asked, and must push work at people rather than waiting for them to check.**

## What we're building

A role-based PWA that is the single source of truth for every piece of content the agency produces. One content item moves through a pipeline, visible to everyone who needs it, with media stored where it actually belongs rather than in chat.

Not a chat replacement. Not a generic project manager. A content pipeline with the agency's specific workflow baked in.

## Users

| Role | Sees | Does |
|---|---|---|
| **Admin / Owner** | Everything | Assigns clients to managers, tracks team performance (scope of work vs. delivered), manages settings and storage |
| **Brand Manager** | Only their assigned clients | Plans the content calendar, schedules shoots, assigns editors, reviews cuts, sends to client, schedules posts |
| **Editor** | Only their assigned edits | Reads the brief, pulls raw from Drive, uploads the cut, handles revision rounds |
| **Cameraman** | Only their own shoots | Calendar of shoots, script and concept per idea, uploads raw through the in-app wrapper |
| **Client** | One deliverable at a time | Opens a magic link, watches the cut, approves or types changes. No account. |

Isolation is strict. A Brand Manager must never see another manager's clients.

## The pipeline

A **content item** — one reel, post, carousel or story — is the central entity. Everything hangs off it.

```
Planned → Calendar approved → Shoot scheduled → Raw uploaded
  → With editor → Cut submitted → Changes requested ⟲
  → Internally approved → With client → Client changes ⟲
  → Client approved → Scheduled → Posted
```

Three things that shape the schema:

- **It loops.** Revisions come from the Brand Manager (internal) or the client. Editors have a dedicated "Re do" queue and cuts are versioned.
- **Two approval levels.** The client approves the monthly *calendar*, and separately approves each finished *cut*.
- **Shoots and content items are many-to-many.** One shoot session covers several ideas; an idea can span two shoot days.

## Where media lives

- **Raw footage (multi-GB):** Google Drive Shared Drive, uploaded through **our own wrapper page** — not Drive's interface. The server opens a Drive resumable session as a service account and hands the browser only the session URI; the browser pushes chunks straight to Google. The cameraman never signs into Google, never sees Drive, and never needs Drive permissions. Sessions live a week, so a closed tab doesn't lose progress — the user re-picks the same file and it continues from where Google left off.
- **Edited cuts (50–150MB), voice notes, reference images:** Backblaze B2, private bucket, presigned URLs.

In the UI: cameramen upload raw through the wrapper; editors open Drive links to pull it; cuts play and upload in-app.

## Decisions already locked

| Area | Decision |
|---|---|
| Auth | Google OAuth only, no passwords |
| Raw deletion | Manual by Admin or Brand Manager; system flags eligible footage and warns on storage thresholds |
| Client access | One magic-link page per deliverable. Expiry + 4-digit PIN. No login, no dashboard. |
| Notifications | Web push only. No WhatsApp, no email digests. |
| Staleness | Cron alerts for stalled shoots, overdue edits, cuts waiting too long |
| AI | Voice-note transcription only |
| Multi-tenancy | `agency_id` everywhere; RapidArc is the platform owner above agency admins |
| Deferred to v2 | Generic Tasks board, Instagram analytics and auto-posting, video transcoding |

## Vocabulary

Use exactly these words in UI copy and code:

**Content item** / **idea** · **Content planner** · **Editors' den** · **Posting schedule** · **Scope of work (SoW)** · **Scope delivered** · **Cut** (an edited version) · **Raw** (unedited footage in Drive) · **Brand Manager** (never "SMM" in the UI)

Never: ticket, task, job, project, asset.

## Canonical sample data

Today's date for all seed and demo data: **23 September 2026.**

**Agency:** Ashmeet SMMA, Ludhiana · Owner: Ashmeet Chaurasia

**Team:** Jaspreet Kaur, Nikhil Sharma, Manreet Gill (Brand Managers) · Rohit Bansal, Simran Kaur (Editors) · Harpreet Singh, Vikram Rana (Cameramen)

| Code | Client | Handle | Niche | Manager | SoW | Delivered | Next shoot | Status |
|---|---|---|---|---|---|---|---|---|
| RAM-01 | Ramana Dental | @ramanadental | Healthcare | Jaspreet | 20 | 14 | 25 Sep, 9:00 AM | 2 approvals due |
| GRV-02 | Grover Motors | @grovermotors | Automotive | Jaspreet | 20 | 20 | 2 Oct, 11:30 AM | On track |
| SDH-03 | Sandhu Interiors | @sandhu.interiors | Interiors | Nikhil | 16 | 6 | 24 Sep, 4:00 PM | 4 approvals due |
| KHN-04 | Khanna Jewellers | @khannajewellers | Retail | Nikhil | 18 | 11 | Not scheduled | 6 days late |
| BSL-05 | Basil Café | @basil.ldh | Food & beverage | Manreet | 12 | 9 | 26 Sep, 8:00 AM | 1 approval due |
| VRD-06 | Verdant Gym | @verdant.fit | Fitness | Manreet | 10 | 0 | Not scheduled | Onboarding |

**Sample content ideas:** Diwali offer reel (Khanna, client changes, 6 days late) · Smile makeover before/after (Ramana, with editor) · Root canal myths (Ramana, with client) · Showroom walkthrough (Grover, posted) · Service package explainer (Grover, scheduled) · Modular kitchen reveal (Sandhu, raw uploaded) · Client testimonial — Mrs. Bedi (Sandhu, shoot scheduled) · New season menu (Basil, internally approved) · Barista's pick (Basil, with editor) · Founder story (Verdant, planned)

## UI status

All screens are designed, built as static HTML and signed off by the client: `admin.html`, `brand-manager.html`, `editor.html`, `cameraman.html`, `login.html`, sharing `theme.css`. They live in `ui-prototypes/`, **outside the Next.js app**.

These are design references, not application code. Converting them into Next.js components — pixel-identical, using the project's Tailwind tokens, with static placeholder data and no backend wiring — is the entire job of Phase 1. Treat the HTML as the spec: if the React output differs visually from the prototype, the React is wrong.

Screen keys in use:

- Admin: clients · calendar · den · posting · planner · team · settings
- Brand Manager: clients · calendar · den · posting · planner
- Editor: todo · redo · library
- Cameraman: shoots (calendar) · pending

Not yet designed: the client magic-link approval page, and the RapidArc platform console.
