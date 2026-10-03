import Link from 'next/link'
import { pendingShoots } from '@/lib/fixtures/cameraman'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function CameramanPendingPage() {
  return (
    <section id="screen-pending">
      <div className="page-head">
        <h1>Pending uploads</h1>
        <p>These shoots happened but no raw footage has been detected in Drive yet.</p>
      </div>

      {pendingShoots.map((s) => (
        <Link key={s.id} href={`/cameraman/shoots?shoot=${s.id}`} className="pending-card">
          <div className="pending-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
              <path d="M12 9v4.5M12 17.2h.01" />
            </svg>
          </div>
          <div className="pending-body">
            <div className="pending-title">{s.name}</div>
            <div className="pending-meta">
              {s.client} · shot {s.date[2]} {MONTHS[s.date[1] - 1]} · no raw detected
            </div>
          </div>
          <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </Link>
      ))}
    </section>
  )
}
