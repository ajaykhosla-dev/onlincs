import { Rail, TopNav } from '@/components/shared'
import { IconCalendar, IconClients, IconClock, IconDen, IconPlanner } from '@/components/shared/icons'
import { ScheduleShootButton } from '@/components/console/ScheduleShootButton'
import '@/styles/screens/console-admin.css'
import '@/styles/screens/console-manager.css'

// Brand Manager chrome, from brand-manager.html: five rail items, no Team or Settings.
export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="r-console">
      <div className="shell">
        <Rail
          initials="JK"
          items={[
            { key: 'clients', label: 'Clients', href: '/manager/clients', icon: <IconClients /> },
            { key: 'calendar', label: 'Calendar', href: '/manager/calendar', icon: <IconCalendar /> },
            { key: 'den', label: "Editors' den", href: '/manager/den', icon: <IconDen />, badge: 2 },
            { key: 'posting', label: 'Posting schedule', href: '/manager/posting', icon: <IconClock /> },
            { key: 'planner', label: 'Content planner', href: '/manager/planner', icon: <IconPlanner /> },
          ]}
        />
        <main className="main">
          <TopNav searchPlaceholder="Search your clients or shoots" gearLabel="Profile settings">
            <ScheduleShootButton />
          </TopNav>
          {children}
        </main>
      </div>
    </div>
  )
}
