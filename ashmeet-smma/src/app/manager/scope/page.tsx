import { ScopeScreen } from '@/components/console/ScopeScreen'
import { ScopeBanner } from '@/components/console/ScopeBanner'
import { sowAnalytics } from '@/lib/analytics'
import { requireGroupUser } from '@/lib/auth/session'
import { monthSchema } from '@/lib/phase3/schemas'

/** A brand manager's own clients only: the analytics layer scopes by accessible clients. */
export default async function ManagerScopePage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const user = await requireGroupUser('manager')
  const requested = (await searchParams).month
  const month = requested && monthSchema.safeParse(requested).success ? requested : new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).slice(0, 7)
  const data = await sowAnalytics(user, month)
  return <><ScopeBanner>Your clients only</ScopeBanner><ScopeScreen data={data} basePath="/manager/scope" canExport /></>
}
