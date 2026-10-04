import { TodoScreen } from '@/components/editor/TodoScreen'
import { editorTasks } from '@/lib/fixtures/editor'

export default function EditorTodoPage() {
  return <><div style={{ padding: '12px 28px 0' }}><Link href="/editor/raw">View assigned raw footage in Drive →</Link></div><TodoScreen tasks={editorTasks} /></>
}
import Link from 'next/link'
