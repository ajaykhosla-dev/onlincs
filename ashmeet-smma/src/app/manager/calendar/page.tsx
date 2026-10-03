import { CalendarScreen } from '@/components/console/CalendarScreen'
import { ScopeBanner } from '@/components/console/ScopeBanner'
import { jaspreetShoots } from '@/lib/fixtures/console-screens'

export default function ManagerCalendarPage() {
  return (
    <CalendarScreen
      banner={<ScopeBanner>Your clients &mdash; Ramana Dental and Grover Motors only</ScopeBanner>}
      shoots={jaspreetShoots}
      subtitle="Shoots for Ramana Dental and Grover Motors."
      monthNav={false}
    />
  )
}
