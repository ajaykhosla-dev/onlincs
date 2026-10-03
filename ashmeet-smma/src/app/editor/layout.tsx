import { Rail, TopNav } from '@/components/shared'
import { IconLibrary, IconRedo, IconTodo } from '@/components/shared/icons'
import '@/styles/screens/editor.css'

// Editor chrome, from editor.html: three-item rail and a TopNav with only search, bell and the Light/Dark segment.
export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="r-editor">
      <div className="shell">
        <Rail
          initials="RB"
          items={[
            { key: 'todo', label: 'To do', href: '/editor/todo', icon: <IconTodo />, badge: 3 },
            { key: 'redo', label: 'Re do', href: '/editor/redo', icon: <IconRedo />, badge: 1 },
            { key: 'library', label: 'Library', href: '/editor/library', icon: <IconLibrary /> },
          ]}
        />
        <main className="main">
          <TopNav searchPlaceholder="Search your edits" />
          {children}
        </main>
      </div>
    </div>
  )
}
