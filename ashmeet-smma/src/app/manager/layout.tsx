import { Rail, TopNav } from '@/components/shared'
import { PwaPrompts } from '@/components/pwa/PwaPrompts'
import { ExportButton } from '@/components/console/ExportButton'
import { ScheduleShootButton } from '@/components/console/ScheduleShootButton'
import { navBadges } from '@/lib/auth/badges'
import { agencyBrand } from '@/lib/auth/brand'
import { SupportBanner } from '@/components/platform/SupportBanner'
import '@/styles/screens/platform.css'
import { navigationFor } from '@/lib/auth/navigation'
import { requireGroupUser } from '@/lib/auth/session'
import '@/styles/screens/console-admin.css'
import '@/styles/screens/console-manager.css'
import '@/styles/screens/review.css'

// Brand Manager chrome, from brand-manager.html: five rail items, no Team or Settings.
export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireGroupUser('manager')
  const brand = await agencyBrand(user.agency_id)
  const navigation = navigationFor(user, 'manager', await navBadges(user))
  return (
    <div className="r-console">
      <SupportBanner user={user} />
      <div className="shell">
        <Rail initials={user.initials} {...navigation} />
        <main className="main">
          <TopNav searchPlaceholder="Search your clients or shoots" gearLabel="Profile settings" user={user} agency={brand}>
            <ExportButton />
            <ScheduleShootButton />
          </TopNav>
          {children}
        </main>
      </div>
      <PwaPrompts />
    </div>
  )
}
