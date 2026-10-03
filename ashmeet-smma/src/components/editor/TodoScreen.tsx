'use client'

import { useState } from 'react'
import { UploadArea } from './UploadArea'
import { Avatar } from '@/components/shared'
import { clientById } from '@/lib/fixtures/console'
import type { EditorTask } from '@/lib/fixtures/editor'

/** To do: the list of cuts ordered by deadline, and the brief for the one you open. */
export function TodoScreen({ tasks }: { tasks: EditorTask[] }) {
  const [openKey, setOpenKey] = useState<string | null>(null)
  const task = tasks.find((t) => t.key === openKey)

  if (task) {
    const b = task.brief
    return (
      <div>
        <a
          href="#"
          className="back-link"
          onClick={(e) => {
            e.preventDefault()
            setOpenKey(null)
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back to To do
        </a>
        <div className="grid">
          <section className="card" style={{ padding: '24px 26px' }}>
            <div className="card-title" style={{ marginBottom: 16 }}>
              {task.idea} &middot; {task.clientName}
            </div>
            {b.concept && (
              <div className="brief-row">
                <b>Concept</b>
                <span>{b.concept}</span>
              </div>
            )}
            {b.script && (
              <div className="brief-row">
                <b>Script</b>
                <span>{b.script}</span>
              </div>
            )}
            {b.instructions && (
              <div className="brief-row">
                <b>Instructions</b>
                <span>{b.instructions}</span>
              </div>
            )}
            {b.reference && (
              <div className="brief-row">
                <b>Reference</b>
                <span>
                  <a href="#" className="ref-link">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 3v12M7 11l5 5 5-5" />
                      <path d="M4 20h16" />
                    </svg>
                    {b.reference}
                  </a>
                </span>
              </div>
            )}

            <button type="button" className="btn-dark" style={{ marginTop: 8 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="4" />
                <path d="M8 3v18M3 8h18" />
              </svg>
              Open raw footage in Drive
            </button>

            <UploadArea label="Upload finished cut" />
          </section>

          <aside className="side">
            <section className="panel">
              <div className="card-title" style={{ marginBottom: 10 }}>
                Deadline
              </div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{task.deadline}</div>
              <div style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: 6 }}>
                Assigned by {task.assignedBy} on {task.assignedOn}
              </div>
            </section>
          </aside>
        </div>
      </div>
    )
  }

  return (
    <div>
      <section className="hero-row" style={{ gridTemplateColumns: '1fr' }}>
        <div className="hello">
          <h1>
            Hi Rohit!<span className="light">Three cuts on your plate</span>
          </h1>
          <p>Ordered by deadline &mdash; the top one is due first.</p>
        </div>
      </section>

      {tasks.map((t) => {
        const client = clientById(t.clientId)
        return (
          <button key={t.key} type="button" className="task-card" onClick={() => setOpenKey(t.key)}>
            <Avatar kind="square" initials={client?.monogram ?? ''} gradient={client?.gradient} />
            <div className="task-main">
              <div className="task-idea">{t.idea}</div>
              <div className="task-meta">
                {t.clientName} &middot; assigned by {t.assignedBy} &middot; assigned {t.assignedOn}
              </div>
            </div>
            <span className={`task-urgency u--${t.urgency.level}`}>{t.urgency.label}</span>
          </button>
        )
      })}
    </div>
  )
}
