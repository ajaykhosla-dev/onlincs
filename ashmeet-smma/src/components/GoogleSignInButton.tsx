// The server route starts Supabase's PKCE flow and stores the return target in an HttpOnly cookie.
export default function GoogleSignInButton({ callbackUrl = '/' }: { callbackUrl?: string }) {
  return (
    <a className="google-btn" href={`/auth/start?next=${encodeURIComponent(callbackUrl)}`}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.48a5.55 5.55 0 0 1-2.4 3.64v3h3.88c2.27-2.09 3.56-5.17 3.56-8.83Z" />
        <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.95-2.9l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.11A12 12 0 0 0 12 24Z" />
        <path fill="#FBBC05" d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.6H1.26a12 12 0 0 0 0 10.8l4.01-3.11Z" />
        <path fill="#EA4335" d="M12 4.75c1.76 0 3.35.6 4.6 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.26 6.6l4.01 3.11C6.22 6.86 8.87 4.75 12 4.75Z" />
      </svg>
      Continue with Google
    </a>
  )
}
