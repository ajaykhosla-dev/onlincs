'use client'

import { agencies, users } from '@/lib/fixtures'

export default function PlatformDashboardPage() {
  return (
    <div className="hello">
      <h1>
        <span className="light">Platform Console</span>
        Multi-tenant management
      </h1>
      <p>{agencies.length} agencies, {users.length} total users across all tenants</p>
    </div>
  )
}
