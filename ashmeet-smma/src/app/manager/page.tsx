'use client'

import { users, clients, shoots, contentItems } from '@/lib/fixtures'

export default function ManagerDashboardPage() {
  // Demo: Jaspreet Kaur's clients
  const jaspreetClients = clients.filter(c => c.manager_id === 'u-2')

  return (
    <div className="hello">
      <h1>
        <span className="light">Good morning, Jaspreet</span>
        Here's your client overview
      </h1>
      <p>Managing {jaspreetClients.length} clients</p>
    </div>
  )
}
