'use client'
import { TopNav, DataTable, Tag, EmptyState } from '@/components/shared'
import { users, clients } from '@/lib/fixtures'

export default function AdminTeamPage() {
  const team = users.filter((u) => u.role === 'brand_manager' || u.role === 'editor' || u.role === 'cameraman')
  return (
    <>
      <TopNav
        title="Team"
        tabs={[
          { label: 'Clients', href: '/admin/clients' },
          { label: 'Calendar', href: '/admin/calendar' },
          { label: 'Editors\' den', href: '/admin/den' },
          { label: 'Posting schedule', href: '/admin/posting' },
          { label: 'Content planner', href: '/admin/planner' },
          { label: 'Team', href: '#' },
          { label: 'Settings', href: '/admin/settings' },
        ]}
        showSearch
        searchPlaceholder="Search team…"
      />

      <div className="hero-row">
        <div className="hello" style={{ padding: '4px 10px 4px 0' }}>
          <h1 style={{ fontSize: 28 }}>Team overview</h1>
          <p style={{ color: 'var(--ink-soft)', fontSize: 13, marginTop: 10 }}>
            {team.length} members across {['brand_manager', 'editor', 'cameraman'].length} roles.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <span className="card-title">All team members</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>NAME</th>
                <th>ROLE</th>
                <th>EMAIL</th>
                <th>PHONE</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {team.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="mgr">
                      <div
                        className="face"
                        style={{ background: u.avatar_gradient, width: 34, height: 34, borderRadius: 12, fontSize: 11 }}
                      >
                        {u.initials}
                      </div>
                      {u.full_name}
                    </div>
                  </td>
                  <td>
                    <Tag
                      variant={
                        u.role === 'brand_manager'
                          ? 'lav'
                          : u.role === 'editor'
                            ? 'sky'
                            : 'mint'
                      }
                    >
                      {u.role.replace(/_/g, ' ')}
                    </Tag>
                  </td>
                  <td style={{ fontSize: '12.5px', color: 'var(--ink-soft)' }}>{u.email}</td>
                  <td style={{ fontSize: '12.5px', color: 'var(--muted)' }}>{u.phone || '—'}</td>
                  <td>
                    <Tag variant={u.is_active ? 'mint' : 'amber'}>
                      {u.is_active ? 'active' : 'inactive'}
                    </Tag>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
