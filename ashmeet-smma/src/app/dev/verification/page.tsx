import { canAccess } from '@/lib/auth/can-access'
import type { User, Role } from '@/types/database'

const ROLES: Role[] = ['admin', 'brand_manager', 'editor', 'cameraman', 'platform_owner']
const RESOURCES = ['content_item', 'client', 'shoot', 'deliverable', 'upload_session', 'agency'] as const
const ACTIONS = ['read', 'write', 'delete'] as const

function makeUser(role: Role): User {
  return {
    id: 'u-test',
    agency_id: 'ag-test',
    email: 'test@test.com',
    full_name: 'Test User',
    initials: 'TU',
    role,
    avatar_gradient: 'linear-gradient(140deg,#8F80F7,#5A4AD8)',
    phone: null,
    is_active: true,
  }
}

const results: { role: Role; resource: string; action: string; allowed: boolean }[] = []

for (const role of ROLES) {
  const user = makeUser(role)
  for (const resource of RESOURCES) {
    for (const action of ACTIONS) {
      results.push({
        role,
        resource,
        action,
        allowed: canAccess(user, resource, action),
      })
    }
  }
}

const roleColor: Record<string, string> = {
  platform_owner: 'bg-violet-100 text-violet-800',
  admin: 'bg-pink-100 text-pink-800',
  brand_manager: 'bg-amber-100 text-amber-800',
  editor: 'bg-sky-100 text-sky-800',
  cameraman: 'bg-mint text-mint-ink',
  client_viewer: 'bg-gray-100 text-gray-800',
}

export default function AuthMatrixPage() {
  const roleSummary = ROLES.map(role => {
    const roleResults = results.filter(r => r.role === role)
    const allowed = roleResults.filter(r => r.allowed).length
    return { role, total: roleResults.length, allowed, denied: roleResults.length - allowed }
  })

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-2">Authorization Matrix</h1>
      <p className="text-gray-400 mb-8 text-sm">
        Phase 0 verification: canAccess() matrix for all 5 roles × 6 resources × 3 actions = {results.length} cells
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-8">
        {roleSummary.map(({ role, allowed, denied, total }) => (
          <div key={role} className="bg-white rounded-xl p-4 shadow-sm border">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${roleColor[role]}`}>
              {role}
            </span>
            <div className="mt-3 text-2xl font-bold">{allowed}/{total}</div>
            <div className="text-xs text-gray-400">allowed</div>
            {denied > 0 && (
              <div className="mt-1 text-xs text-gray-400">{denied} denied</div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left p-3 font-bold text-gray-500">Role</th>
              <th className="text-left p-3 font-bold text-gray-500">Resource</th>
              <th className="text-left p-3 font-bold text-gray-500">Action</th>
              <th className="text-left p-3 font-bold text-gray-500">Allowed</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={i} className={`border-b last:border-0 ${r.allowed ? 'bg-green-50' : 'bg-red-50'}`}>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${roleColor[r.role]}`}>
                    {r.role}
                  </span>
                </td>
                <td className="p-3 font-medium">{r.resource}</td>
                <td className="p-3">{r.action}</td>
                <td className="p-3">
                  <span className={r.allowed ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                    {r.allowed ? '✓ Yes' : '✗ No'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 p-4 bg-gray-50 rounded-xl">
        <h2 className="font-bold mb-2">Expected behavior</h2>
        <ul className="text-sm text-gray-600 space-y-1">
          <li><strong>platform_owner</strong> — all actions on all resources (18 green cells)</li>
          <li><strong>admin</strong> — all actions within agency (18 green cells)</li>
          <li><strong>brand_manager</strong> — read/write on client-related resources, denied agency</li>
          <li><strong>editor</strong> — read/write on assigned content_items, read clients and deliverables</li>
          <li><strong>cameraman</strong> — read/write on own shoots, read content_items via shoot_items</li>
        </ul>
      </div>
    </div>
  )
}
