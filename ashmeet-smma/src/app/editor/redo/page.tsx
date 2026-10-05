import { LiveQueue } from '@/components/editor/LiveQueue'
import { requireGroupUser } from '@/lib/auth/session'
import { editorWork } from '@/lib/phase5/data'

export default async function EditorRedoPage() {
  const user = await requireGroupUser('editor')
  const items = (await editorWork(user)).filter((item) => ['with_editor','changes_requested','client_changes'].includes(item.status) && item.versions.length > 0)
  return <LiveQueue items={items} mode="redo" name={user.full_name.split(' ')[0]} userId={user.id} />
}
