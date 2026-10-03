import { Rail, TopNav } from '@/components/shared'
import { AddClientButton } from '@/components/console/AddClientButton'
import {
  IconClients,
  IconDownload,
  IconPerformance,
  IconPipeline,
} from '@/components/shared/icons'
import { navigationFor } from '@/lib/auth/navigation'
import { requireGroupUser } from '@/lib/auth/session'
import '@/styles/screens/console-admin.css'
import '@/styles/screens/console-manager.css'

// Admin chrome, from admin.html. Rail active state follows the URL.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireGroupUser('admin')
  const navigation = navigationFor(user, 'admin')
  return (
    <div className="r-console">
      <div className="shell">
        <Rail initials={user.initials} {...navigation} />
        <main className="main">
          <TopNav
            tabs={[
              { label: 'Clients', icon: <IconClients w={2} />, active: true },
              { label: 'Pipeline', icon: <IconPipeline /> },
              { label: 'Performance', icon: <IconPerformance /> },
            ]}
            searchPlaceholder="Search clients or shoots"
            gearLabel="Settings"
            user={user}
          >
            <button type="button" className="btn-soft">
              <IconDownload />
              Export data
              <span className="chip">XLS</span>
            </button>
            <AddClientButton />
          </TopNav>
          {children}
        </main>
      </div>
    </div>
  )
}
