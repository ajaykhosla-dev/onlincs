# Phase 2 Auth rollout

## Google redirect URI mismatch

The running app sends `http://localhost:3000/auth/callback` to Supabase as its app return URL. Supabase sends Google `https://sxinatwqirjzdtlypbrh.supabase.co/auth/v1/callback` as the Google OAuth redirect URI. The latter must be in **Google Cloud Console > Google Auth Platform > Clients > [the Web application client configured in Supabase] > Authorized redirect URIs**. It is a different setting from Supabase's redirect allow list. Preserve any existing redirect URIs when adding it.

The Google client ID in the outbound request matches the project's former NextAuth client ID, so edit that exact Google OAuth client. Google requires scheme, host, path, and trailing slash to match exactly.

1. Apply [`004_auth_identity.sql`](../supabase/migrations/004_auth_identity.sql) to the Supabase project. The migration retains the seeded `users.id` text IDs and adds a unique `auth_user_id` UUID link. Existing foreign keys continue to reference `users.id`.
2. In Supabase Dashboard > Authentication > Hooks, enable **Before User Created** with Postgres function `public.allow_invited_auth_user`. This blocks accounts whose email is not exactly one active invited workspace user.
3. In the same page, enable **Custom Access Token** with Postgres function `public.workspace_access_token`. The JWT then includes `workspace_user_id`, `agency_id`, and `workspace_role`; the standard JWT `role` remains `authenticated`.
4. Run `node --env-file=.env.local --conditions=react-server --import tsx scripts/provision-auth-users.ts` to preview, then add `--apply` to create Auth identities for the active invited users. No invitation email is sent. The script verifies each Auth UUID was linked to the matching workspace user. This step has already been completed for all 14 active users.
5. Run [`verify-auth-identity.sql`](../scripts/verify-auth-identity.sql) in the SQL Editor. Both failure counts should be zero.
6. Sign in with the invited Google account and check role home, a forbidden route, reload, browser restart, and sign-out. Use an uninvited Google account to check the invite error. Repeat for admin, brand manager, editor, and cameraman accounts to complete the Phase 2 self-audit.

The app cannot enable Auth hooks through a database migration alone; they must be selected in the Supabase Auth dashboard. Route authorization checks the current `users` row on the server even when role and agency claims are present in the JWT.
