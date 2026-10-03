'use client'

import { useRef, type ReactNode } from 'react'
import { useDialogFocus } from './useDialogFocus'

/**
 * Right-hand panel over a dimmed backdrop (bottom sheet on mobile, via the drawer CSS).
 * Closes on the × button, Escape and a backdrop click. Focus moves in on open, is trapped
 * while open, and returns to the trigger on close.
 */
export function SlideOver({
  open,
  onClose,
  title,
  ariaLabel,
  closeLabel,
  flex = false,
  children,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  ariaLabel: string
  closeLabel: string
  /** Lay the panel out as a column (the cameraman sheet scrolls its body) */
  flex?: boolean
  children: ReactNode
}) {
  const ref = useRef<HTMLElement>(null)
  useDialogFocus(open, ref, onClose)

  return (
    <>
      <div className="drawer-backdrop" style={{ display: open ? 'block' : 'none' }} onClick={onClose} />
      <aside
        ref={ref}
        className="drawer"
        style={open ? (flex ? { display: 'flex', flexDirection: 'column' } : { display: 'block' }) : { display: 'none' }}
        aria-label={ariaLabel}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
      >
        <div className="modal-head">
          <div className="modal-title">{title}</div>
          <button type="button" className="modal-close" aria-label={closeLabel} onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </aside>
    </>
  )
}
