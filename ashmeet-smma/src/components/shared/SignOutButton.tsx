'use client'

import { useEffect } from 'react'

export function SignOutButton({ variant = 'rail' }: { variant?: 'rail' | 'topnav' }) {
  useEffect(() => {
    const onRestore = () => {
      // A signed-out page can be restored from the browser back-forward cache.
      // The CSS class was applied before leaving, so its cached snapshot is hidden.
      if (document.documentElement.classList.contains('auth-exit')) {
        window.location.replace('/auth/login')
      }
    }
    window.addEventListener('pageshow', onRestore)
    return () => window.removeEventListener('pageshow', onRestore)
  }, [])

  return (
    <form action="/auth/signout" method="post" onSubmit={() => document.documentElement.classList.add('auth-exit')}><button type="submit" className={variant === 'rail' ? 'rail-signout' : 'topnav-signout'} aria-label="Sign out" title="Sign out">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10 17l5-5-5-5M15 12H3M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" />
      </svg>
      {variant === 'rail' && <span className="tip">Sign out</span>}
    </button></form>
  )
}
