'use client'

import { useState, type ReactNode } from 'react'
import { Avatar, Tag } from '@/components/shared'
import { clientById, teamById } from '@/lib/fixtures/console'
import type { DenRow, ReviewComment } from '@/lib/fixtures/console-screens'

export type DenReview = { title: string; meta: string; comments: ReviewComment[] }

/**
 * Editors' den: the list of cuts awaiting review, and the review detail with its timestamped
 * comments panel. Shared by Admin and Brand Manager; the caller supplies the scoped rows and intro.
 */
export function DenScreen({
  banner,
  title,
  intro,
  rows,
  reviews,
}: {
  banner?: ReactNode
  title: string
  intro: string
  rows: DenRow[]
  reviews: Record<string, DenReview>
}) {
  const [reviewing, setReviewing] = useState<string | null>(null)
  const review = reviewing ? reviews[reviewing] : null

  if (review) {
    return (
      <div>
        <a
          href="#"
          className="back-link"
          onClick={(e) => {
            e.preventDefault()
            setReviewing(null)
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back to Editors&apos; den
        </a>
        <div className="review-layout">
          <section className="card" style={{ padding: 22 }}>
            <div className="video-ph">
              <div className="play-glyph">
                <svg viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{review.title}</div>
                <div style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: 4 }}>{review.meta}</div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn-pink">
                  Send changes
                </button>
                <button type="button" className="btn-dark">
                  Approve
                </button>
              </div>
            </div>
          </section>

          <aside className="card" style={{ padding: '20px 22px' }}>
            <div className="card-title" style={{ marginBottom: 14 }}>
              Comments
            </div>
            {review.comments.length === 0 && (
              <div className="comment-text" style={{ marginTop: 0 }}>
                No comments yet.
              </div>
            )}
            {review.comments.map((c) => (
              <div key={c.id} className="comment">
                <div className="comment-head">
                  <span className="comment-ts">{c.range}</span>
                  <span className="comment-author">{c.author}</span>
                </div>
                {c.text && <div className="comment-text">{c.text}</div>}
                {c.voice && (
                  <>
                    <div className="voice-note">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                        <path d="M19 11a7 7 0 0 1-14 0M12 18v4" />
                      </svg>
                      <span className="voice-wave" aria-hidden="true" />
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)' }}>{c.voice.duration}</span>
                    </div>
                    <div className="transcript">{c.voice.transcript}</div>
                  </>
                )}
              </div>
            ))}
          </aside>
        </div>
      </div>
    )
  }

  return (
    <div>
      {banner}
      <section className="hero-row" style={{ gridTemplateColumns: '1fr' }}>
        <div className="hello">
          <h1>
            Editors&apos; den<span className="light">{title}</span>
          </h1>
          <p>{intro}</p>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <div className="card-title">Awaiting review</div>
        </div>
        <div>
          {rows.map((r) => {
            const client = clientById(r.clientId)
            const editor = teamById(r.editorId)
            return (
              <button key={r.key} type="button" className="den-row" onClick={() => setReviewing(r.key)}>
                <Avatar kind="square" initials={client?.monogram ?? ''} gradient={client?.gradient} />
                <div className="den-main">
                  <div className="den-idea">{r.idea}</div>
                  <div className="den-meta">
                    {r.clientName} &middot; edited by {editor?.full_name} &middot; v{r.version}
                  </div>
                </div>
                <span className="den-deadline">{r.deadline}</span>
                <Tag variant={r.status.tone}>{r.status.label}</Tag>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
