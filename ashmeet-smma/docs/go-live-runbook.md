# Go-live runbook and rollback plan

For Phase 10 step 6. The code cannot do this part; people do. Work top to bottom and tick as you go.

## Before the day

- [ ] Create a **separate production Supabase project**. The current project is labelled production but holds seed data. Apply migrations 001 to 012 in order, but **do not apply the `002_seed*.sql` files** to it.
- [ ] Deploy to Vercel (Pro, or an external scheduler, for sub-daily crons). Set every variable in `.env.example`, including `NEXT_PUBLIC_APP_URL` (the real HTTPS URL), `CRON_SECRET`, VAPID keys, B2 and Drive credentials, and optionally `TRANSCRIPTION_API_KEY`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`.
- [ ] Run `scripts/schedule-staleness-cron.mjs <app-url> --apply` so the staleness job runs hourly. Confirm in `cron.job_run_details`.
- [ ] Add the production origin to the B2 bucket CORS rule (voice-note and cut uploads go browser to B2). Add it to the Google Cloud OAuth redirect URIs and Supabase Auth redirect URLs.
- [ ] Confirm the Google Workspace plan supports Shared Drives, and the service account is a member of the Shared Drive.
- [ ] Rotate the secrets that were pasted into chat during the build (service-account key, Supabase keys).

## Load the real data

- [ ] Real agency row, clients, scope for the current month, team users (invited by Gmail).
- [ ] Enter in-flight work at the right statuses, and this month's content plan.
- [ ] Provision Drive folders for active clients; grant editors read access to the Shared Drive.
- [ ] Each person signs in with their own Google account. Check `/api/auth/check` as each role.

## Observed sessions (do not explain; watch)

- [ ] Admin: clients, scope, team, storage.
- [ ] Brand manager: plan, schedule a shoot, review a cut, send a client link, schedule and mark a post.
- [ ] Editor: receive an edit, open raw in Drive, upload a cut, handle a revision.
- [ ] Cameraman, **on his own phone**: install the app, turn on notifications, open the schedule in airplane mode, complete a real shoot-to-upload cycle, including one interrupted and resumed upload. If he needs explaining, change the screen.

## Two-week parallel period

WhatsApp stays as a fallback for two weeks. At the end, review: overdue-post count, notifications opened, uploads completed. Then cut over.

## Rollback plan

If cutover fails or data is wrong:
1. **Stop writes.** Set the agency to `suspended` (`update agencies set status='suspended' where id=...`) once Phase 11 suspension is in place; until then, tell the team to return to WhatsApp and the sheets and pause the app by removing the Vercel production alias.
2. **Nothing is destroyed.** Media lives in Drive and B2 untouched; the database is the only thing that moves.
3. **Database:** take a Supabase backup (point-in-time recovery or `pg_dump`) immediately before go-live and again before cutover. To roll back, restore that backup to a new project and point the app at it.
4. **Code:** redeploy the previous Vercel deployment (instant rollback in the Vercel dashboard). Migrations are additive, so older code keeps working against a newer schema.
5. **Notifications:** unsubscribe devices by clearing `push_subscriptions` if pushes become noisy.
6. Record what failed in `docs/progress.md` before trying again.

## After launch

- Remove `src/app/admin/upload-test` once nobody needs it.
- Watch Sentry, the overdue-post card and the storage view daily for the first fortnight.
