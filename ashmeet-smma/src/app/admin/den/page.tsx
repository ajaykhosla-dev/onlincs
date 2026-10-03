import { DenScreen, type DenReview } from '@/components/console/DenScreen'
import { teamById } from '@/lib/fixtures/console'
import { denRows, diwaliComments } from '@/lib/fixtures/console-screens'

// Every row opens a review built from its own title and meta; only the Diwali reel has seeded comments.
const reviews: Record<string, DenReview> = Object.fromEntries(
  denRows.map((r) => [
    r.key,
    {
      title: r.idea,
      meta: `${r.clientName} · ${teamById(r.editorId)?.full_name} · version ${r.version}`,
      comments: r.key === 'diwali' ? diwaliComments : [],
    },
  ])
)

export default function AdminDenPage() {
  return (
    <DenScreen
      title="Cuts awaiting review, oldest deadline first"
      intro="Four cuts need your eyes before they go back to the client or out the door."
      rows={denRows}
      reviews={reviews}
    />
  )
}
