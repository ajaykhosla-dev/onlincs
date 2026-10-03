import { PlannerScreen } from '@/components/console/PlannerScreen'
import { clientRows } from '@/lib/fixtures/console'
import { planItems } from '@/lib/fixtures/console-screens'

export default function AdminPlannerPage() {
  return (
    <PlannerScreen
      intro="Pick a client, then lay out what gets made and when."
      clientOptions={clientRows.map((c) => c.name)}
      planClient="Ramana Dental"
      plans={planItems}
      emptyDay={{ day: 27, label: '27 September', short: '27 Sep' }}
    />
  )
}
