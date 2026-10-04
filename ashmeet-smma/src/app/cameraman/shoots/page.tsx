import { Suspense } from 'react'
import { LiveShootsCalendar } from '@/components/cameraman/LiveShootsCalendar'

export default function CameramanShootsPage() {
  // useSearchParams (the ?shoot= deep link from Pending uploads) needs a Suspense boundary
  return (
    <Suspense>
      <LiveShootsCalendar />
    </Suspense>
  )
}
