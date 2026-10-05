import { Rail, TopNav } from '@/components/shared'
import { PwaPrompts } from '@/components/pwa/PwaPrompts'
import { navBadges } from '@/lib/auth/badges'
import { agencyBrand } from '@/lib/auth/brand'
import { SupportBanner } from '@/components/platform/SupportBanner'
import '@/styles/screens/platform.css'
import { navigationFor } from '@/lib/auth/navigation'
import { requireGroupUser } from '@/lib/auth/session'
import '@/styles/screens/editor.css'
import '@/styles/screens/review.css'

// Editor chrome, from editor.html: three-item rail and a TopNav with only search, bell and the Light/Dark segment.
export default async function EditorLayout({ children }: { children: React.ReactNode }) {
  const user = await requireGroupUser('editor')
  const brand = await agencyBrand(user.agency_id)
  const navigation = navigationFor(user, 'editor', await navBadges(user))
  return (
    <div className="r-editor">
      <SupportBanner user={user} />
      <div className="shell">
        <Rail initials={user.initials} {...navigation} />
        <main className="main">
          <TopNav searchPlaceholder="Search your edits" user={user} agency={brand} />
          {children}
        </main>
      </div>
      <PwaPrompts />
    </div>
  )
}
