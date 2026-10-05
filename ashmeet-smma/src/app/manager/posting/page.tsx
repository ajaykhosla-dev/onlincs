import { LivePosting } from '@/components/console/LivePosting'
import { ScopeBanner } from '@/components/console/ScopeBanner'
import { requireGroupUser } from '@/lib/auth/session'
import { accessibleClients } from '@/lib/phase3/data'

export default async function ManagerPostingPage() {
  const user = await requireGroupUser('manager')
  const names = (await accessibleClients(user)).map((client) => client.name)
  return <LivePosting
    banner={<ScopeBanner>Your clients &mdash; {names.length ? names.join(' and ') : 'none assigned yet'} only</ScopeBanner>}
    intro="What's going out for your accounts." />
}
