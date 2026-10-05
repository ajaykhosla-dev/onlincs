import { Rail, TopNav } from '@/components/shared'
import { PwaPrompts } from '@/components/pwa/PwaPrompts'
import { OfflineBanner } from '@/components/cameraman/OfflineBanner'
import { TabBar } from '@/components/cameraman/TabBar'
import { navBadges } from '@/lib/auth/badges'
import { agencyBrand } from '@/lib/auth/brand'
import { SupportBanner } from '@/components/platform/SupportBanner'
import '@/styles/screens/platform.css'
import { navigationFor } from '@/lib/auth/navigation'
import { requireGroupUser } from '@/lib/auth/session'
import '@/styles/screens/cameraman.css'

// Cameraman chrome, from cameraman.html: a two-item rail on larger screens, a bottom tab bar on mobile.
export default async function CameramanLayout({ children }: { children: React.ReactNode }) {
  const user = await requireGroupUser('cameraman')
  const brand = await agencyBrand(user.agency_id)
  const navigation = navigationFor(user, 'cameraman', await navBadges(user))
  return (
    <div className="r-cam">
      <SupportBanner user={user} />
      <div className="shell">
        <Rail initials={user.initials} {...navigation} />
        <main className="main">
          <TopNav appearance={false} user={user} agency={brand} />
          <OfflineBanner />
          {children}
        </main>
      </div>
      <TabBar />
      <PwaPrompts />
    </div>
  )
}
