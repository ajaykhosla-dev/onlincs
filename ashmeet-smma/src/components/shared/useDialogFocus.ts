'use client'

import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/**
 * Dialog focus handling: Escape closes, Tab is trapped inside `ref`, focus moves into the dialog
 * when it opens, and returns to whatever had it (the trigger) when it closes.
 */
export function useDialogFocus(open: boolean, ref: RefObject<HTMLElement | null>, onClose: () => void) {
  // keep the latest callback without re-running the effect (which would steal focus on every render)
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const trigger = document.activeElement as HTMLElement | null
    const node = ref.current
    const items = () => (node ? Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)) : [])
    ;(items()[0] ?? node)?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        closeRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const list = items()
      if (list.length === 0) return
      const first = list[0]
      const last = list[list.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      trigger?.focus?.()
    }
  }, [open, ref])
}
