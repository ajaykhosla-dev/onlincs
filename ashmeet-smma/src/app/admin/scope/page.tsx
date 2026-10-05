import { ScopeScreen } from '@/components/console/ScopeScreen'
import { sowAnalytics } from '@/lib/analytics'
import { requireGroupUser } from '@/lib/auth/session'
import { monthSchema } from '@/lib/phase3/schemas'

export default async function AdminScopePage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const user = await requireGroupUser('admin')
  const requested = (await searchParams).month
  const month = requested && monthSchema.safeParse(requested).success ? requested : new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).slice(0, 7)
  return <ScopeScreen data={await sowAnalytics(user, month)} basePath="/admin/scope" canExport />
}
