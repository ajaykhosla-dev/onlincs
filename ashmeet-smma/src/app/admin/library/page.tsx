import { LiveLibrary } from '@/components/editor/LiveLibrary'
import { requireGroupUser } from '@/lib/auth/session'
import { libraryData } from '@/lib/phase5/data'

export default async function AdminLibraryPage() {
  const user = await requireGroupUser('admin')
  const data = await libraryData(user)
  return <LiveLibrary {...data} />
}
