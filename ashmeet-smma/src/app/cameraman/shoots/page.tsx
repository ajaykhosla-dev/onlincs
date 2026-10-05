import { Suspense } from 'react'
import { LiveShootsCalendar } from '@/components/cameraman/LiveShootsCalendar'
import { requireGroupUser } from '@/lib/auth/session'

export default async function CameramanShootsPage() {
  const user = await requireGroupUser('cameraman')
  // useSearchParams (the ?shoot= deep link from Pending uploads) needs a Suspense boundary
  return (
    <Suspense>
      <LiveShootsCalendar userId={user.id} />
    </Suspense>
  )
}
