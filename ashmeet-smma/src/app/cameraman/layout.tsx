import { Rail, TopNav } from '@/components/shared'
import { OfflineBanner } from '@/components/cameraman/OfflineBanner'
import { TabBar } from '@/components/cameraman/TabBar'
import { navigationFor } from '@/lib/auth/navigation'
import { requireGroupUser } from '@/lib/auth/session'
import '@/styles/screens/cameraman.css'

// Cameraman chrome, from cameraman.html: a two-item rail on larger screens, a bottom tab bar on mobile.
export default async function CameramanLayout({ children }: { children: React.ReactNode }) {
  const user = await requireGroupUser('cameraman')
  const navigation = navigationFor(user, 'cameraman')
  return (
    <div className="r-cam">
      <div className="shell">
        <Rail initials={user.initials} {...navigation} />
        <main className="main">
          <TopNav appearance={false} bell={false} user={user} />
          <OfflineBanner />
          {children}
        </main>
      </div>
      <TabBar />
    </div>
  )
}
