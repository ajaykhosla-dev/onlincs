import { requirePlatformOwner } from '@/lib/platform/auth'

/** Everything in the console needs a verified second factor; without one the owner is sent to set it up or confirm it. */
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformOwner({ requireMfa: true })
  return children
}
