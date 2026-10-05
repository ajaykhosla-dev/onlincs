import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/current-user'
import { homeForRole } from '@/lib/auth/routing'
import '@/styles/screens/review.css'
import '@/styles/screens/account.css'

/** Settings shared by every signed-in role, outside the role workspaces. */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login?expired=1')
  return <main className="account-page">
    <Link href={homeForRole(user.role) ?? '/'} className="account-back">← Back to {user.full_name.split(' ')[0]}&apos;s workspace</Link>
    {children}
  </main>
}
