'use client'

import { users, clients, contentItems, shoots, deliverableVersions, postSchedule } from '@/lib/fixtures'

export default function AdminDashboardPage() {
  const activeClients = clients.filter(c => c.status === 'active').length
  const activeShoots = shoots.filter(s => s.status === 'scheduled').length
  const pendingApprovals = deliverableVersions.filter(dv => dv.status === 'submitted').length
  const scheduledPosts = postSchedule.filter(ps => !ps.posted_at).length

  return (
    <div className="hello">
      <h1>
        <span className="light">Good morning, Ashmeet</span>
        Here's what's happening today
      </h1>
      <p>You have {pendingApprovals} pending approvals and {scheduledPosts} posts scheduled.</p>
    </div>
  )
}
