'use client'

/** The client page must never show a stack trace, and nothing about the failure is sent from here. */
export default function ApproveError({ reset }: { error: Error; reset: () => void }) {
  return <main className="approve-page" style={{ padding: 16 }}><div className="approve-card"><div className="approve-notice" role="alert">
    <h1>We could not load this page</h1><p>Check your connection and try again. If it keeps happening, ask your contact for a new link.</p>
    <div className="approve-actions"><button type="button" className="approve-btn primary" onClick={reset}>Try again</button></div></div></div></main>
}
