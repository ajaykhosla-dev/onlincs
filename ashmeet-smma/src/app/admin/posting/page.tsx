import { LivePosting } from '@/components/console/LivePosting'
import { requireGroupUser } from '@/lib/auth/session'

export default async function AdminPostingPage() {
  await requireGroupUser('admin')
  return <LivePosting intro="What's going out, when, and in what format — across every client." />
}
