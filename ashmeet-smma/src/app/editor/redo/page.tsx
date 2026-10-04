import { LiveQueue } from '@/components/editor/LiveQueue'
import { requireGroupUser } from '@/lib/auth/session'
import { editorWork } from '@/lib/phase5/data'

export default async function EditorRedoPage() {
  const user = await requireGroupUser('editor')
  const items = (await editorWork(user)).filter((item) => item.status === 'with_editor' && item.versions.length > 0)
  return <LiveQueue items={items} mode="redo" name={user.full_name.split(' ')[0]} />
}
