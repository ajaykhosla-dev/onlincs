import GoogleSignInButton from '@/components/GoogleSignInButton'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/current-user'
import { homeForRole, safeReturnTo } from '@/lib/auth/routing'
import '@/styles/screens/login.css'

// Ported from login.html. Google OAuth is started by the Supabase Auth route.
export default async function LoginPage({ searchParams }: { searchParams?: Promise<{ next?: string; error?: string; expired?: string }> }) {
  const params = await searchParams
  const activeUser = await getCurrentUser()
  const home = activeUser && homeForRole(activeUser.role)
  const requested = safeReturnTo(params?.next)
  if (home) redirect(requested && !requested.startsWith('/auth') ? requested : home)
  const callbackUrl = requested ?? '/'
  const message = params?.error === 'not_invited' || params?.error === 'AccessDenied'
    ? "This account isn't part of a workspace yet. Ask your agency owner for an invite."
    : params?.error === 'workspace_unavailable'
      ? 'Workspace sign-in is temporarily unavailable. Please try again.'
    : params?.error === 'suspended'
      ? 'This workspace has been suspended. Contact RapidArc AI to restore access. Your data is safe.'
    : params?.expired === '1'
      ? 'Your session expired, please sign in again.'
      : null
  return (
    <main className="r-login">
      <div className="login-shell">
        <section className="login-brand">
          <div className="wordmark">
            <div className="wordmark-badge">RA</div>
            <div className="wordmark-text">RapidArc AI</div>
          </div>

          <h1>One place to run the whole agency.</h1>
          <p className="lede">
            RapidArc AI replaces WhatsApp threads and scattered sheets with a single view of every shoot, cut and post
            &mdash; from idea to published.
          </p>

          <div className="value-list">
            <div className="value-row">
              <div className="value-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <p>
                <b>Nothing gets lost.</b> Every idea, shoot and cut is tracked from planning through to posted.
              </p>
            </div>
            <div className="value-row">
              <div className="value-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="9" cy="8" r="3.6" />
                  <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
                  <path d="M17 5.2a3.6 3.6 0 0 1 0 6.9M18.2 14.4A5.6 5.6 0 0 1 22 20" />
                </svg>
              </div>
              <p>
                <b>Everyone sees only what&apos;s theirs.</b> Brand managers, editors and cameramen each get a focused
                view.
              </p>
            </div>
            <div className="value-row">
              <div className="value-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.7 21a2 2 0 0 1-3.4 0" />
                </svg>
              </div>
              <p>
                <b>No more chasing status.</b> Deadlines, approvals and revisions are visible without asking.
              </p>
            </div>
          </div>

          <div className="login-footer">Built by RapidArc AI</div>
        </section>

        <section className="login-panel">
          <div className="login-card">
            <div className="eyebrow">Workspace</div>
            <h2>Ashmeet SMMA</h2>
            <p>Sign in with the Google account your agency invited to this workspace.</p>

            {message && <p role="alert" className="login-message">{message}</p>}
            <GoogleSignInButton callbackUrl={callbackUrl} />

            <div className="access-note">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5M12 16h.01" />
              </svg>
              <p>
                Access and role are set by an invite from your agency owner &mdash; there&apos;s no separate sign-up. If
                you don&apos;t have an invite yet, ask Ashmeet to add you.
              </p>
            </div>

            <a href="#" className="support-link">
              Need help signing in? Contact support
            </a>
          </div>
        </section>
      </div>
    </main>
  )
}
