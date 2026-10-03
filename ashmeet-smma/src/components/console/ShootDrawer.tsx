'use client'

import { SlideOver } from '@/components/shared'
import { IconDownload } from '@/components/shared/icons'
import { teamById } from '@/lib/fixtures/console'
import type { ShootCard } from '@/lib/fixtures/console-screens'

/** Shoot detail panel used by the Calendar screens (Admin and Brand Manager). */
export function ShootDrawer({ shoot, onClose }: { shoot: ShootCard | null; onClose: () => void }) {
  const cameraman = teamById(shoot?.cameramanId ?? null)
  return (
    <SlideOver open={!!shoot} onClose={onClose} title={shoot?.title} ariaLabel="Shoot detail" closeLabel="Close shoot detail">
      {shoot && (
        <>
          <div className="field">
            <label>Date &amp; time</label>
            <div style={{ fontSize: '13.5px', fontWeight: 700 }}>{shoot.when}</div>
          </div>
          <div className="field">
            <label>Client</label>
            <div style={{ fontSize: '13.5px', fontWeight: 700 }}>{shoot.clientName}</div>
          </div>
          <div className="field">
            <label>Cameraman</label>
            <div style={{ fontSize: '13.5px', fontWeight: 700 }}>{cameraman?.full_name}</div>
          </div>
          <div className="field">
            <label>Content ideas covered</label>
            <div style={{ fontSize: '13px', color: 'var(--ink-soft)', lineHeight: 1.9 }}>
              {shoot.ideas.map((idea, i) => (
                <span key={idea}>
                  {i > 0 && <br />}• {idea}
                </span>
              ))}
            </div>
          </div>
          <button type="button" className="btn-dark" style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}>
            <IconDownload size={15} />
            Open Drive folder
          </button>
        </>
      )}
    </SlideOver>
  )
}
