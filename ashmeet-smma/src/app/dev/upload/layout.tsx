import { requireGroupUser } from '@/lib/auth/session'

export default async function UploadTestLayout({ children }: { children: React.ReactNode }) {
  await requireGroupUser('cameraman')
  return children
}
