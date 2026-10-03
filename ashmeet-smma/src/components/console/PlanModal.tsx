'use client'

import { Modal } from '@/components/shared'

/** "Plan content" form opened from an empty day on the Content planner. Phase 1: visual only. */
export function PlanModal({ open, onClose, dateLabel }: { open: boolean; onClose: () => void; dateLabel: string }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId="plan-modal-title"
      title={<>Plan content &middot; {dateLabel}</>}
      closeLabel="Close plan form"
      footer={
        <>
          <button type="button" className="btn-soft" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-dark" onClick={onClose}>
            Save plan
          </button>
        </>
      }
    >
      <div className="field">
        <label htmlFor="pf-type">Type</label>
        <select id="pf-type">
          <option>Reel</option>
          <option>Post</option>
          <option>Carousel</option>
          <option>Story</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="pf-date">Date &amp; time</label>
        <input id="pf-date" type="text" defaultValue={`${dateLabel} · 10:00 AM`} />
      </div>
      <div className="field">
        <label htmlFor="pf-ref">Reference link</label>
        <input id="pf-ref" type="text" placeholder="https://drive.google.com/…" />
      </div>
      <div className="field">
        <label htmlFor="pf-ei">Instructions for editor</label>
        <textarea id="pf-ei" placeholder="Concept, pacing, music mood…" />
      </div>
      <div className="field">
        <label htmlFor="pf-ci">Instructions for cameraman</label>
        <textarea id="pf-ci" placeholder="Shot list, angles, talking points…" />
      </div>
      <div className="field">
        <label htmlFor="pf-img">Image references</label>
        <input id="pf-img" type="text" placeholder="Attach or paste links" />
      </div>
      <div className="field">
        <label htmlFor="pf-status">Status</label>
        <select id="pf-status">
          <option>Planned</option>
          <option>Calendar approved</option>
        </select>
      </div>
      <div className="field" style={{ marginBottom: 0 }}>
        <label htmlFor="pf-notes">Notes</label>
        <textarea id="pf-notes" placeholder="Anything else worth flagging" />
      </div>
    </Modal>
  )
}
