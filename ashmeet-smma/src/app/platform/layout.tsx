import { requireGroupUser } from '@/lib/auth/session'

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireGroupUser('platform')
  return <>{children}</>
}
