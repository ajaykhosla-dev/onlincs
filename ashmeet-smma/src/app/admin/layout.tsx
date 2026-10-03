import { Rail, TopNav } from '@/components/shared'
import {
  IconCalendar,
  IconClients,
  IconDen,
  IconClock,
  IconDownload,
  IconPerformance,
  IconPipeline,
  IconPlanner,
  IconPlus,
  IconSettings,
  IconTeam,
} from '@/components/shared/icons'
import '@/styles/screens/console-admin.css'
import '@/styles/screens/console-manager.css'

// Admin chrome, from admin.html. Rail active state follows the URL.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="r-console">
      <div className="shell">
        <Rail
          initials="AC"
          items={[
            { key: 'clients', label: 'Clients', href: '/admin/clients', icon: <IconClients /> },
            { key: 'calendar', label: 'Calendar', href: '/admin/calendar', icon: <IconCalendar /> },
            { key: 'den', label: "Editors' den", href: '/admin/den', icon: <IconDen />, badge: 4 },
            { key: 'posting', label: 'Posting schedule', href: '/admin/posting', icon: <IconClock /> },
            { key: 'planner', label: 'Content planner', href: '/admin/planner', icon: <IconPlanner /> },
            { key: 'team', label: 'Team', href: '/admin/team', icon: <IconTeam /> },
          ]}
          foot={[{ key: 'settings', label: 'Settings', href: '/admin/settings', icon: <IconSettings /> }]}
        />
        <main className="main">
          <TopNav
            tabs={[
              { label: 'Clients', icon: <IconClients w={2} />, active: true },
              { label: 'Pipeline', icon: <IconPipeline /> },
              { label: 'Performance', icon: <IconPerformance /> },
            ]}
            searchPlaceholder="Search clients or shoots"
            gearLabel="Settings"
          >
            <button type="button" className="btn-soft">
              <IconDownload />
              Export data
              <span className="chip">XLS</span>
            </button>
            <button type="button" className="btn-dark">
              <IconPlus />
              Add client
            </button>
          </TopNav>
          {children}
        </main>
      </div>
    </div>
  )
}
