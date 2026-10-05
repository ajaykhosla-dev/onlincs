import { DashboardCards } from '@/components/console/DashboardCards'
import { LiveClients } from '@/components/console/LiveClients'

export default function AdminClientsPage() {
  return <>
    <DashboardCards />
    <LiveClients admin />
  </>
}
