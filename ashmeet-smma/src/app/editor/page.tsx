'use client'

import { contentItems, deliverableVersions, shoots } from '@/lib/fixtures'

export default function EditorDashboardPage() {
  // Demo: Rohit Bansal's assignments
  const myItems = contentItems.filter(ci => ci.assigned_editor_id === 'u-5')
  const needsAction = myItems.filter(ci =>
    ['cut_submitted', 'changes_requested'].includes(ci.status)
  ).length

  return (
    <div className="hello">
      <h1>
        <span className="light">Good morning, Rohit</span>
        Here's your edit queue
      </h1>
      <p>{myItems.length} items assigned, {needsAction} need your attention</p>
    </div>
  )
}
