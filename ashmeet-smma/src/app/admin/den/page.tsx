import { LiveDen } from '@/components/console/LiveDen'
import { requireGroupUser } from '@/lib/auth/session'
import { denData } from '@/lib/phase5/data'

export default async function AdminDenPage() {
  const user = await requireGroupUser('admin')
  const data = await denData(user)
  return <LiveDen {...data} userId={user.id} />
}
