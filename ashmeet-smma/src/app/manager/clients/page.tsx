import { DashboardCards } from '@/components/console/DashboardCards'
import { LiveClients } from '@/components/console/LiveClients'

export default function ManagerClientsPage() {
  return <>
    <DashboardCards />
    <LiveClients admin={false} />
  </>
}
