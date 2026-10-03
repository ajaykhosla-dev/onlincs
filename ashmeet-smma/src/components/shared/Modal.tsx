'use client'

import { useRef, type ReactNode } from 'react'
import { useDialogFocus } from './useDialogFocus'

/** Centred dialog over a dimmed backdrop. Closes on ×, Escape and a click on the backdrop itself. */
export function Modal({
  open,
  onClose,
  title,
  titleId,
  closeLabel,
  footer,
  children,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  titleId: string
  closeLabel: string
  footer?: ReactNode
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useDialogFocus(open, ref, onClose)

  return (
    <div
      className="modal-backdrop"
      style={{ display: open ? 'flex' : 'none' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div ref={ref} className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div className="modal-head">
          <div className="modal-title" id={titleId}>
            {title}
          </div>
          <button type="button" className="modal-close" aria-label={closeLabel} onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}
