import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

// In Next.js 16, the login page is a server component.
// Auth is handled by NextAuth at the API level.
// Client-side session management happens after auth.

export default async function LoginPage() {
  // If user is already authenticated (via cookies), they shouldn't be here
  // The actual Google sign-in happens via the NextAuth route

  return (
    <div className="login-shell">
      <div className="login-brand">
        <div className="wordmark">
          <div className="wordmark-badge">RA</div>
          <div className="wordmark-text">RapidArc</div>
        </div>
        <h1>Content pipeline for growing agencies</h1>
        <p className="lede">
          Plan shoots, manage edits, get client approvals, and schedule posts — all in one place.
        </p>
        <div className="value-list">
          <div className="value-row">
            <div className="value-icon">🎬</div>
            <p>Shoot planning with Drive-backed raw uploads</p>
          </div>
          <div className="value-row">
            <div className="value-icon">✂️</div>
            <p>Editor review with timestamped comments and voice notes</p>
          </div>
          <div className="value-row">
            <div className="value-icon">📱</div>
            <p>Client approval links — no login required</p>
          </div>
        </div>
        <div className="login-footer">RapidArc SMMA Platform</div>
      </div>

      <div className="login-panel">
        <div className="login-card">
          <div className="eyebrow">Welcome back</div>
          <h2>Sign in to your account</h2>
          <p>Use your Google account to access the platform</p>

          <a
            href="/api/auth/signin"
            className="google-btn"
          >
            <svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </a>

          <div className="access-note">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <p>Only @ashmeetsmma.com accounts are authorized. Contact your admin if you need access.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
