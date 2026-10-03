import { DenScreen, type DenReview } from '@/components/console/DenScreen'
import { ScopeBanner } from '@/components/console/ScopeBanner'
import { teamById } from '@/lib/fixtures/console'
import { jaspreetDenRows, rootCanalComments } from '@/lib/fixtures/console-screens'

const reviews: Record<string, DenReview> = Object.fromEntries(
  jaspreetDenRows.map((r) => [
    r.key,
    {
      title: r.idea,
      meta: `${r.clientName} · ${teamById(r.editorId)?.full_name} · version ${r.version}`,
      comments: r.key === 'rootcanal' ? rootCanalComments : [],
    },
  ])
)

export default function ManagerDenPage() {
  return (
    <DenScreen
      banner={<ScopeBanner>Your clients &mdash; Ramana Dental and Grover Motors only</ScopeBanner>}
      title="Cuts awaiting your review"
      intro="One cut needs changes sent back, one is ready for a first look."
      rows={jaspreetDenRows}
      reviews={reviews}
    />
  )
}
