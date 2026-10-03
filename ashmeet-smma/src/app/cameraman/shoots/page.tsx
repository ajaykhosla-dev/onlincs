import { Suspense } from 'react'
import { ShootsCalendar } from '@/components/cameraman/ShootsCalendar'

export default function CameramanShootsPage() {
  // useSearchParams (the ?shoot= deep link from Pending uploads) needs a Suspense boundary
  return (
    <Suspense>
      <ShootsCalendar />
    </Suspense>
  )
}
