import { Rail } from '@/components/shared'
import { IconCalendar, IconUpload } from '@/components/shared/icons'
import { OfflineBanner } from '@/components/cameraman/OfflineBanner'
import { TabBar } from '@/components/cameraman/TabBar'
import { pendingShoots } from '@/lib/fixtures/cameraman'
import '@/styles/screens/cameraman.css'

// Cameraman chrome, from cameraman.html: a two-item rail on larger screens, a bottom tab bar on mobile.
export default function CameramanLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="r-cam">
      <div className="shell">
        <Rail
          initials="HS"
          items={[
            { key: 'shoots', label: 'Calendar', href: '/cameraman/shoots', icon: <IconCalendar /> },
            { key: 'pending', label: 'Pending uploads', href: '/cameraman/pending', icon: <IconUpload />, badge: pendingShoots.length },
          ]}
        />
        <main className="main">
          <OfflineBanner />
          {children}
        </main>
      </div>
      <TabBar />
    </div>
  )
}
