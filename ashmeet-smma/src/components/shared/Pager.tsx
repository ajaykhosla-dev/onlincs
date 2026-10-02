'use client'

import React from 'react'

interface PagerProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  totalItems?: number
  pageSize?: number
}

export function Pager({ currentPage, totalPages, onPageChange, totalItems, pageSize = 10 }: PagerProps) {
  const startItem = totalItems !== undefined ? (currentPage - 1) * pageSize + 1 : 0
  const endItem = totalItems !== undefined ? Math.min(currentPage * pageSize, totalItems) : 0

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <div className="table-foot">
      {totalItems !== undefined && (
        <span className="foot-note">
          Showing <b>{startItem}–{endItem}</b> of {totalItems}
        </span>
      )}
      <div className="pager">
        <button
          className="pg"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        {pages.map(p => (
          <button
            key={p}
            className={`pg ${p === currentPage ? 'is-active' : ''}`}
            onClick={() => onPageChange(p)}
            disabled={p === currentPage}
          >
            {p}
          </button>
        ))}
        <button
          className="pg"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
  )
}
