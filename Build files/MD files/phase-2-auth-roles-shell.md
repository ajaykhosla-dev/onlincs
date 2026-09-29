# Phase 2 — Auth, Roles & Shell

## Objective

Replace the static shell with real authentication. Google OAuth signs a user in, their role determines which route group they land in, and every route is protected server-side. Screens still render fixture data — only identity and access become real.

## Context

Phase 0 built the schema, RLS and `canAccess()`. Phase 1 built all 18 routes with fixtures and no auth. The `users` table is seeded but those rows are not yet linked to `auth.users`.

Auth comes before features deliberately: retrofitting a permission matrix across eighteen screens is far more painful than building on top of one.

---

## Step 1 — Google OAuth

### What to do

Configure Google OAuth in the Supabase dashboard and Google Cloud console. Add the redirect URLs for local and production. Restrict sign-in to invited users only — a Google account with no matching `users` row must be rejected with a clear message, not silently given an empty account.

Wire the Login page's Google button to `signInWithOAuth`. On callback, look up the `users` row by email, attach `agency_id` and `role` to the session, and redirect to that role's home route.

Link the seeded users to `auth.users` by email in a migration so the seed data has working logins.

### Checkpoint 1

- [ ] Signing in as Ashmeet's Google account lands on `/admin/clients`
- [ ] Signing in with a Google account that has no `users` row shows "This account isn't part of a workspace yet" and does not create a session
- [ ] `users.id` matches `auth.users.id` for all 8 seeded users
- [ ] The session carries `agency_id` and `role`, verified by logging the decoded JWT
- [ ] A deactivated user (`is_active = false`) cannot sign in

---

## Step 2 — Session and route protection

### What to do

Add Next.js middleware that refreshes the Supabase session on every request and redirects unauthenticated users to `/login`, preserving the attempted URL as a return target.

Create `lib/auth/session.ts` with `getCurrentUser()` for server components, returning the `users` row plus role and agency. Every protected page calls it. Never trust a role passed from the client.

Build a `/403` page in the product's visual style for authorized-but-forbidden access, distinct from a 404.

### Checkpoint 2

- [ ] Visiting any protected route while signed out redirects to `/login`
- [ ] After signing in, the user lands on the route they originally attempted
- [ ] `getCurrentUser()` returns null rather than throwing when there is no session
- [ ] Manually editing a role value in client-side state changes nothing about what renders
- [ ] Session persists across a hard refresh and a browser restart
- [ ] `/403` renders in the product style, not a default Next.js error page

---

## Step 3 — Role-based routing

### What to do

Each role has a home route: admin → `/admin/clients`, brand_manager → `/manager/clients`, editor → `/editor/todo`, cameraman → `/cameraman/shoots`.

A user reaching a route group outside their role gets `/403`, not a redirect — silent redirects hide bugs. `platform_owner` may enter any group.

Make the Rail render its items from the signed-in user's role rather than a hardcoded array, and the TopNav show the real user's name, initials and avatar gradient.

### Checkpoint 3

- [ ] Each of the four roles lands on its correct home route after sign-in
- [ ] An editor visiting `/admin/clients` receives `/403`
- [ ] A cameraman visiting `/manager/den` receives `/403`
- [ ] The rail shows 7 items for admin, 5 for brand_manager, 3 for editor, 2 for cameraman
- [ ] The TopNav shows the signed-in user's real name and initials on every route
- [ ] `platform_owner` can reach all four groups

---

## Step 4 — Authorization in route handlers

### What to do

Create one protected API route per role group as a working pattern for later phases: it calls `getCurrentUser()`, then `canAccess()`, then returns data or 403. Document the pattern in a comment other phases can copy.

Add a Zod-validated request body helper and a typed error response shape used by every route from here on.

Verify no client component imports the service-role client.

### Checkpoint 4

- [ ] Four example routes exist, each calling `getCurrentUser()` then `canAccess()`
- [ ] Calling one with no session returns 401; with the wrong role returns 403
- [ ] Malformed request bodies return 400 with a Zod-derived message that leaks no internals
- [ ] `grep -r "service_role" app/ components/` finds nothing outside `lib/supabase/admin.ts`
- [ ] `grep -rn "role ===" app/ components/` finds nothing — role logic lives only in `lib/auth/`

---

## Step 5 — Sign out and account states

### What to do

Wire sign-out in the rail's settings area: clears the session, redirects to `/login`, and leaves no cached user data behind.

Handle expired sessions gracefully — a mid-session expiry redirects to login with a message rather than throwing. Add loading states for the auth check so protected pages never flash content before the redirect.

### Checkpoint 5

- [ ] Sign-out clears the session and returns to `/login`
- [ ] Pressing back after sign-out does not show cached protected content
- [ ] An expired session redirects with "Your session expired, please sign in again"
- [ ] No protected content is visible during the auth check, verified by throttling the network

---

## Self-Audit Instruction

Before declaring this phase complete, you must:

1. Re-read every checkpoint in this phase file
2. Test each one for real — sign in as each of the four roles and attempt the forbidden routes yourself
3. Return a structured report:
   ✅ [Checkpoint] — Pass
   ⚠️ [Checkpoint] — Partial: [specific reason]
   ❌ [Checkpoint] — Fail: [specific reason]
4. Fix all failures and partials before reporting phase complete.
5. Only say "Phase 2 Complete" when every checkbox is green.
6. Update `docs/progress.md` with what was built, deviations, and anything carried into Phase 3.

## Final Phase 2 Checklist

- [ ] Google OAuth works; uninvited accounts are rejected
- [ ] All 18 routes protected server-side
- [ ] Each role lands correctly and is blocked from other groups with 403
- [ ] Rail and TopNav render from the real signed-in user
- [ ] Route handler authorization pattern established and documented
- [ ] Sign-out and session expiry handled cleanly
- [ ] Self-audit passed with all green
- [ ] `docs/progress.md` updated
