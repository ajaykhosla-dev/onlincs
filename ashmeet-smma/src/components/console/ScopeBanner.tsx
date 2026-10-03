/** The "Your clients" reminder pill shown at the top of every Brand Manager screen. */
export function ScopeBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="scope-banner">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3 4 6v6c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V6l-8-3Z" />
      </svg>
      {children}
    </div>
  )
}
