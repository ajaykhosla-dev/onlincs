import { Rail, TopNav } from '@/components/shared'
import { ScheduleShootButton } from '@/components/console/ScheduleShootButton'
import { navigationFor } from '@/lib/auth/navigation'
import { requireGroupUser } from '@/lib/auth/session'
import '@/styles/screens/console-admin.css'
import '@/styles/screens/console-manager.css'

// Brand Manager chrome, from brand-manager.html: five rail items, no Team or Settings.
export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireGroupUser('manager')
  const navigation = navigationFor(user, 'manager')
  return (
    <div className="r-console">
      <div className="shell">
        <Rail initials={user.initials} {...navigation} />
        <main className="main">
          <TopNav searchPlaceholder="Search your clients or shoots" gearLabel="Profile settings" user={user}>
            <ScheduleShootButton />
          </TopNav>
          {children}
        </main>
      </div>
    </div>
  )
}
