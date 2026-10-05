import { TeamScreen } from '@/components/console/TeamScreen'
import { teamAnalytics } from '@/lib/analytics'
import { requireGroupUser } from '@/lib/auth/session'
import { monthSchema } from '@/lib/phase3/schemas'

/** Admin and platform owner only: the admin layout refuses everyone else with a 403 before this runs. */
export default async function AdminTeamPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const user = await requireGroupUser('admin')
  const requested = (await searchParams).month
  const month = requested && monthSchema.safeParse(requested).success ? requested : new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).slice(0, 7)
  const { agency, groups } = await teamAnalytics(user, month)
  return <TeamScreen month={month} agency={agency} groups={groups} />
}
