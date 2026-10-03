import type { QueueItem } from '@/lib/fixtures/console'

const svg = (children: React.ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)

const ICON: Record<QueueItem['icon'], React.ReactNode> = {
  video: svg(
    <>
      <rect x="2" y="4" width="20" height="16" rx="4" />
      <path d="m10 9 5 3-5 3V9Z" />
    </>
  ),
  calendar: svg(
    <>
      <rect x="3" y="4" width="18" height="17" rx="4" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>
  ),
  person: svg(
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M18 8v6M21 11h-6" />
    </>
  ),
  clock: svg(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
}

/** The "Waiting on you" rows. Rendered inside a `.card.queue`. */
export function QueueList({ items }: { items: QueueItem[] }) {
  return (
    <>
      {items.map((q) => (
        <div key={q.id} className={`queue-item q--${q.tone}`}>
          <div className="queue-icon">{ICON[q.icon]}</div>
          <div className="queue-body">
            <div className="queue-title">{q.title}</div>
            <div className="queue-meta">{q.meta}</div>
          </div>
          <span className="queue-age">{q.age}</span>
        </div>
      ))}
    </>
  )
}
