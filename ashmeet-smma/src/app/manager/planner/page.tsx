import { PlannerScreen } from '@/components/console/PlannerScreen'
import { ScopeBanner } from '@/components/console/ScopeBanner'
import { jaspreetClients } from '@/lib/fixtures/console'
import { planItems } from '@/lib/fixtures/console-screens'

export default function ManagerPlannerPage() {
  return (
    <PlannerScreen
      banner={<ScopeBanner>Your clients &mdash; Ramana Dental and Grover Motors only</ScopeBanner>}
      intro="Pick one of your two clients, then lay out what gets made and when."
      clientOptions={jaspreetClients.map((c) => c.name)}
      planClient="Ramana Dental"
      plans={planItems}
      emptyDay={{ day: 27, label: '27 September', short: '27 Sep' }}
    />
  )
}
