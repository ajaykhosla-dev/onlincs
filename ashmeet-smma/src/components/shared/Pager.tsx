'use client'

import type { ReactNode } from 'react'

const chevron = (d: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
)

/** Table footer: a count note and, when there is more than one page, the page buttons. */
export function Pager({ note, page, pages, onPage }: { note: ReactNode; page?: number; pages?: number; onPage?: (p: number) => void }) {
  return (
    <div className="table-foot">
      <div className="foot-note">{note}</div>
      {page !== undefined && pages !== undefined && (
        <div className="pager">
          <button type="button" className="pg" disabled={page <= 1} aria-label="Previous page" onClick={() => onPage?.(page - 1)}>
            {chevron('m15 18-6-6 6-6')}
          </button>
          {Array.from({ length: pages }, (_, i) => (
            <button key={i} type="button" className={`pg${page === i + 1 ? ' is-active' : ''}`} aria-current={page === i + 1 ? 'page' : undefined} onClick={() => onPage?.(i + 1)}>
              {i + 1}
            </button>
          ))}
          <button type="button" className="pg" disabled={page >= pages} aria-label="Next page" onClick={() => onPage?.(page + 1)}>
            {chevron('m9 18 6-6-6-6')}
          </button>
        </div>
      )}
    </div>
  )
}
