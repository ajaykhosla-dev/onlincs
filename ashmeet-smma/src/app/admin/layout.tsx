import { Rail, TopNav } from '@/components/shared'
import { PwaPrompts } from '@/components/pwa/PwaPrompts'
import { AddClientButton } from '@/components/console/AddClientButton'
import { ExportButton } from '@/components/console/ExportButton'
import { navBadges } from '@/lib/auth/badges'
import { agencyBrand } from '@/lib/auth/brand'
import { SupportBanner } from '@/components/platform/SupportBanner'
import '@/styles/screens/platform.css'
import { navigationFor } from '@/lib/auth/navigation'
import { requireGroupUser } from '@/lib/auth/session'
import '@/styles/screens/console-admin.css'
import '@/styles/screens/console-manager.css'
import '@/styles/screens/review.css'

// Admin chrome, from admin.html. Rail active state follows the URL.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireGroupUser('admin')
  const brand = await agencyBrand(user.agency_id)
  const navigation = navigationFor(user, 'admin', await navBadges(user))
  return (
    <div className="r-console">
      <SupportBanner user={user} />
      <div className="shell">
        <Rail initials={user.initials} {...navigation} />
        <main className="main">
          <TopNav
            searchPlaceholder="Search clients or shoots"
            user={user} agency={brand}
          >
            <ExportButton />
            <AddClientButton />
          </TopNav>
          {children}
        </main>
      </div>
      <PwaPrompts />
    </div>
  )
}
