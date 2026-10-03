import { TodoScreen } from '@/components/editor/TodoScreen'
import { editorTasks } from '@/lib/fixtures/editor'

export default function EditorTodoPage() {
  return <TodoScreen tasks={editorTasks} />
}
