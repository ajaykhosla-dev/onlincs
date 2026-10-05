# Phase 11 platform console audit

Status: development complete, migration `013` applied live. Everything that can be checked without a second agency's real Google and Backblaze accounts, and without a signed-in platform owner, has been checked. The console itself has not yet been used by a person.

## What was built

**Access and two-factor (`/platform`).** A separate route group with its own layout: dark chrome, amber rule and a PLATFORM badge, so it cannot be mistaken for an agency workspace. Only a `platform_owner` passes the layout; a signed-in agency user is sent to `/403`, a signed-out visitor to login. Every console page and every `/api/platform/*` route also requires an authenticator-app code (Supabase TOTP, assurance level 2): with no enrolled factor the owner is taken to setup (QR code, confirm one code); with one, to a code check. The console stays locked until the session reaches AAL2. Every platform action writes `activity_log` with `entity_type = 'platform'`, into the audit trail of the agency it touched.

**Onboarding.** Agency list (plan, status, clients, users, raw storage, created). Onboarding form creates the agency row, an empty `agency_integrations` row and the admin's user record in one transaction (`phase11_create_agency`), then creates the admin's sign-in identity and sends the invite email (falls back to creating the identity without email if mail fails, and says so; "Resend invite" is on the agency page). Edit details, display name and logo link. Display name and logo appear in that agency's top navigation only.

**Credentials.** Per-agency Drive (service-account key, email, Shared Drive ID) and B2 (bucket, prefix, endpoint, region, key ID, application key). Write-only: each value is encrypted with `CREDENTIAL_ENCRYPTION_KEY` before it is stored; the console shows only a fingerprint or last four; saving a value that already exists is logged as a rotation, by field name, never by value. `agency_integrations` has RLS on, no policies and no grants for the API roles. The key box accepts the downloaded JSON file or just the private key, with escaped `\n`, surrounding quotes, CRLF, spaces or lost line breaks. "Test connection" runs real checks per step with that agency's own credentials: sign in as the service account, reach the Shared Drive, create and remove a folder, B2 presigned upload, ranged read (HTTP 206), private-bucket check, cleanup, and whether the key is restricted to the agency's prefix; each failure names the step.

**Per-agency Drive and B2 in the product.** Drive folder provisioning, upload sessions, completion, the hourly sync, storage deletion and the storage comparison now use the agency's own service account (`lib/integrations/credentials.ts`). B2 signing picks the client from the object key's agency prefix. An agency with no Drive credentials cannot use another agency's: the environment credentials are used only for the original Ashmeet workspace.

**Support access (view-as-agency).** Enter requires a reason and opens that agency's workspace as a read-only admin. A banner is pinned to every workspace screen for all four roles and cannot be dismissed; its only exit is "Exit support session", which ends the session and clears the cookies. Entry, elevation and exit (with duration) are written to the viewed agency's `activity_log`, and its admin sees them under Settings, "Platform and support access". Writes are refused in the proxy for any API call unless the owner has turned on a separate 15-minute elevation (with a reason, also logged), and the database refuses them independently because the acting user is not an admin of any agency. Sessions end after two hours.

**Lifecycle.** Suspend (with a reason) blocks sign-in for every user of the agency at login and on every request, with a clear message; nothing is deleted; reactivation is instant; the platform agency cannot be suspended. Usage per agency (clients, users, content items, this month's planned items, raw storage). Complete data export as JSON plus a media manifest (Drive files, B2 cuts, library assets, voice notes). Credentials, link hashes, session URIs and push subscriptions are never included.

## Verified

- `scripts/verify-phase11-migration.mjs` (rollback-only on the live database): onboarding creates the three records and a log row, the new agency is empty, only the owner may onboard, duplicate slug and email and bad slug are refused, suspension and reactivation work and leave other agencies and all data untouched, the platform agency cannot be suspended, support duration is recorded, and the API roles hold no privileges on credentials, support sessions or the platform functions.
- `npm run verify:tenants` (30 assertions against the live database, with a temporary agency that is removed): a new agency has no Drive access, Northside cannot borrow another agency's Drive, credentials are encrypted at rest and never returned, a key pasted with escaped newlines is restored exactly, each agency's objects are signed with its own key, bucket and endpoint and never with another's, rotation takes effect at once, analytics inputs for two agencies are disjoint and a new agency's are empty, a magic-link token resolves only to its own agency and an Ashmeet admin cannot act on a Northside item.
- `tests/isolation.test.ts` extended (20 tests, all pass on the live database): platform-only tables unreadable by every API role, each agency admin sees only its own platform audit trail, a cut event in one agency creates no notification in another, and no notification, link, comment, post or raw file points across agencies.
- Unit tests: credential parsing in every pasted shape, support-session read-only and elevation rules (including a replayed session cookie, another session's elevation, expired and tampered cookies).
- TOTP enrolment works on this Supabase project (probed with a throwaway user, since removed).
- Smoke test of the built app: `/platform` redirects a signed-out visitor to login, `/api/platform/*` returns 403, a forged support cookie grants nothing. Full suite 80 of 80, route audit 64 routes with none unprotected, client bundle scan clean.

## Not verified (needs a person or a second set of real accounts)

1. **Create the platform owner** (none exists yet): `node --env-file=.env.local scripts/create-platform-owner.mjs <email> "<name>" --apply`, sign in with that Google account, complete two-factor setup. Then walk the console in a browser: onboarding, details, credentials, test connection, support session, suspension, export.
2. **Two genuinely separate agencies with their own Google and Backblaze accounts.** The cross-agency Drive and B2 isolation is proven at the routing level (which credentials sign which key) but not against real second accounts: agency A's service account being refused on agency B's Shared Drive, and A's B2 key being refused on B's prefix, depend on how those accounts are set up. "Test connection" reports whether a B2 key is restricted to the agency's prefix.
3. The invitation email actually arriving (depends on the Supabase project's email settings; the fallback path is in place).
4. A suspended agency's users being turned away in a real browser (the rule is enforced at login and on every request; not clicked through).
5. The support banner and the read-only block in a browser, and the agency admin seeing the entry in Settings.
6. "Deliberately breaking one RLS policy makes the suite fail" was proven in Phase 0 on a throwaway database and was not repeated here, because it means committing a leaky policy to the live database.

## Deviations

- Logo is an https image link, not an uploaded file.
- The ten tenant tables the spec's isolation suite names are covered by the existing suite's "every tenant table" tests plus the additions above; there is no per-route cross-agency HTTP journey test because that needs signed-in sessions for two agencies.
- The original Ashmeet workspace keeps running on the environment Drive and B2 credentials until its own are entered in the console (a fallback limited to that one agency).
- View-as-agency always renders as that agency's admin; manager, editor and cameraman screens are not reachable in a support session.
