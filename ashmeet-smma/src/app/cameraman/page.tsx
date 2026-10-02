'use client'

import { shoots, shootItems } from '@/lib/fixtures'

export default function CameramanDashboardPage() {
  // Demo: Harpreet Singh's shoots
  const myShoots = shoots.filter(s => s.cameraman_id === 'u-7')
  const upcoming = myShoots.filter(s => s.status === 'scheduled').length

  return (
    <div className="hello">
      <h1>
        <span className="light">Good morning, Harpreet</span>
        Here's your shoot schedule
      </h1>
      <p>{myShoots.length} shoots, {upcoming} upcoming</p>
    </div>
  )
}
