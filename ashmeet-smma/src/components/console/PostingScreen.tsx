'use client'

import { useState, type ReactNode } from 'react'
import { MonthGrid, type MonthDay } from './MonthGrid'
import { IconDen, IconDownload } from '@/components/shared/icons'
import type { PostItem } from '@/lib/fixtures/console-screens'

/**
 * Posting schedule: month grid plus a day panel with caption, music and the final-cut download.
 * Shared by Admin and Brand Manager. `emptyDay` (Brand Manager only) is a clickable day with nothing scheduled.
 */
export function PostingScreen({
  banner,
  intro,
  posts,
  initialKey,
  emptyDay,
  panelTone,
}: {
  banner?: ReactNode
  intro: string
  posts: PostItem[]
  initialKey: string
  emptyDay?: { day: number; label: string }
  panelTone: 'sky' | 'lav'
}) {
  const [selected, setSelected] = useState<string>(initialKey)
  const post = posts.find((p) => p.key === selected)

  const days: Record<number, MonthDay> = {}
  for (const p of posts) {
    days[p.day] = { onClick: () => setSelected(p.key), children: <span className={`cal-chip c--${p.chipTone}`}>{p.chip}</span> }
  }
  if (emptyDay) days[emptyDay.day] = { onClick: () => setSelected('empty') }

  return (
    <>
      {banner}
      <section className="hero-row" style={{ gridTemplateColumns: '1fr' }}>
        <div className="hello">
          <h1>
            Posting schedule<span className="light">September 2026</span>
          </h1>
          <p>{intro}</p>
        </div>
      </section>

      <div className="grid">
        <section className="card" style={{ padding: '22px 26px' }}>
          <div className="card-head" style={{ padding: '0 0 16px' }}>
            <div className="card-title">September 2026</div>
          </div>
          <MonthGrid year={2026} month={8} today={23} days={days} />
        </section>

        <aside className="side">
          <section className="card queue">
            <div className="card-head" style={{ padding: '0 0 4px' }}>
              <div className="card-title">{post ? post.panelTitle : emptyDay?.label}</div>
            </div>
            {post ? (
              <>
                <div className={`queue-item q--${panelTone}`}>
                  <div className="queue-icon">
                    <IconDen w={2} />
                  </div>
                  <div className="queue-body">
                    <div className="queue-title">{post.name}</div>
                    <div className="queue-meta">{post.meta}</div>
                  </div>
                </div>
                <div style={{ padding: '12px 0 16px', fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
                  <b>Caption:</b> {post.caption}
                  <br />
                  {post.music.startsWith('Music:') ? (
                    <>
                      <b>Music:</b>
                      {post.music.slice('Music:'.length)}
                    </>
                  ) : (
                    post.music
                  )}
                </div>
                <button type="button" className="btn-soft" style={{ width: '100%', justifyContent: 'center' }}>
                  <IconDownload />
                  Download final cut
                </button>
              </>
            ) : (
              <div style={{ padding: '12px 0 16px', fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
                Nothing scheduled to post on {emptyDay?.label}.
              </div>
            )}
          </section>
        </aside>
      </div>
    </>
  )
}
