import { redirect } from 'next/navigation'
import LoginClient from '@/app/auth/login/page'
import { getCurrentUser } from '@/lib/auth/current-user'
import { homeForRole } from '@/lib/auth/routing'

export default async function Home() {
  const user = await getCurrentUser()

  const home = user && homeForRole(user.role)
  if (home) redirect(home)

  return <LoginClient />
}
