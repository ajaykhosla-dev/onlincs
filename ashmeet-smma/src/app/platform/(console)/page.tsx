import { AgencyList } from '@/components/platform/AgencyList'
import { listAgencies } from '@/lib/platform/agencies'

export const dynamic = 'force-dynamic'

export default async function PlatformHome() {
  return <AgencyList agencies={await listAgencies()} />
}
