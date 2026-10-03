import { Rail, TopNav } from '@/components/shared'
import { navigationFor } from '@/lib/auth/navigation'
import { requireGroupUser } from '@/lib/auth/session'
import '@/styles/screens/editor.css'

// Editor chrome, from editor.html: three-item rail and a TopNav with only search, bell and the Light/Dark segment.
export default async function EditorLayout({ children }: { children: React.ReactNode }) {
  const user = await requireGroupUser('editor')
  const navigation = navigationFor(user, 'editor')
  return (
    <div className="r-editor">
      <div className="shell">
        <Rail initials={user.initials} {...navigation} />
        <main className="main">
          <TopNav searchPlaceholder="Search your edits" user={user} />
          {children}
        </main>
      </div>
    </div>
  )
}
