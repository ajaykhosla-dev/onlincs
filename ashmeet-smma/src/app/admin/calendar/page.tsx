import { CalendarScreen } from '@/components/console/CalendarScreen'
import { shootCards } from '@/lib/fixtures/console-screens'

export default function AdminCalendarPage() {
  return <CalendarScreen shoots={shootCards} subtitle="Every shoot on the books this month, colour-coded by client." />
}
