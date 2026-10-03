'use client'

import { useState } from 'react'
import { Modal } from '@/components/shared'
import { IconPlus } from '@/components/shared/icons'
import { jaspreetClients, team } from '@/lib/fixtures/console'
import { scheduleIdeas } from '@/lib/fixtures/console-screens'
import { hasRole } from '@/lib/auth/roles'

/** The Brand Manager's "Schedule a shoot" action and its modal. Phase 1: visual only. */
export function ScheduleShootButton() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <>
      <button type="button" className="btn-dark" onClick={() => setOpen(true)}>
        <IconPlus />
        Schedule a shoot
      </button>
      <Modal
        open={open}
        onClose={close}
        titleId="schedule-modal-title"
        title="Schedule a shoot"
        closeLabel="Close schedule shoot form"
        footer={
          <>
            <button type="button" className="btn-soft" onClick={close}>
              Cancel
            </button>
            <button type="button" className="btn-dark" onClick={close}>
              Schedule shoot
            </button>
          </>
        }
      >
        <div className="field">
          <label htmlFor="sf-date">Date</label>
          <input id="sf-date" type="text" placeholder="e.g. 29 Sep 2026" />
        </div>
        <div className="field">
          <label htmlFor="sf-time">Time</label>
          <input id="sf-time" type="text" placeholder="e.g. 10:00 AM" />
        </div>
        <div className="field">
          <label htmlFor="sf-client">Client</label>
          <select id="sf-client">
            {jaspreetClients.map((c) => (
              <option key={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="sf-cam">Cameraman</label>
          <select id="sf-cam">
            {team
              .filter(hasRole('cameraman'))
              .map((m) => (
                <option key={m.id}>{m.full_name}</option>
              ))}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Content ideas to cover</label>
          <div className="check-list">
            {scheduleIdeas.map((idea) => (
              <label key={idea.label} className="check-row">
                <input type="checkbox" defaultChecked={idea.checked} /> {idea.label}
              </label>
            ))}
          </div>
        </div>
      </Modal>
    </>
  )
}
