import { StorageView } from '@/components/console/StorageView'
import { requireGroupUser } from '@/lib/auth/session'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { Avatar, DataTable, Tag, type Column } from '@/components/shared'
import type { User } from '@/types/database'
import { InviteMemberButton } from '@/components/console/InviteMemberButton'

type TeamMember = Pick<User, 'id' | 'full_name' | 'initials' | 'role' | 'avatar_gradient' | 'email'>
import { settingsRoles } from '@/lib/fixtures/console-screens'

const columns: Column<TeamMember>[] = [
  {
    header: 'Member',
    cell: (m) => (
      <div className="client">
        <Avatar initials={m.initials} gradient={m.avatar_gradient} />
        <div className="client-name">{m.full_name}</div>
      </div>
    ),
  },
  { header: 'Role', cell: (m) => <Tag variant={settingsRoles[m.role]?.tone ?? 'grey'}>{settingsRoles[m.role]?.label ?? m.role}</Tag> },
  { header: 'Email', cell: (m) => m.email, tdStyle: { fontSize: '12.5px', color: 'var(--ink-soft)' } },
]

export default async function AdminSettingsPage() {
  const user = await requireGroupUser('admin')
  const { data: members } = await supabaseAdmin.from('users').select('id,full_name,initials,role,avatar_gradient,email').eq('agency_id', user.agency_id).eq('is_active', true).neq('role', 'platform_owner').order('created_at')
  const team = (members ?? []) as TeamMember[]
  const { data: platform } = await supabaseAdmin.from('activity_log').select('id,action,created_at,metadata').eq('agency_id', user.agency_id).eq('entity_type', 'platform').order('created_at', { ascending: false }).limit(20)
  return (
    <>
      <section className="hero-row" style={{ gridTemplateColumns: '1fr' }}>
        <div className="hello">
          <h1>
            Settings<span className="light">Agency profile &amp; connections</span>
          </h1>
          <p>How Ashmeet SMMA is wired into Drive, Backblaze, and the team.</p>
        </div>
      </section>

      <div className="settings-grid">
        <section className="panel">
          <div className="card-title" style={{ marginBottom: 14 }}>
            Agency profile
          </div>
          <div className="field">
            <label htmlFor="ag-name">Agency name</label>
            <input id="ag-name" type="text" placeholder="Enter agency name" defaultValue="Ashmeet SMMA" />
          </div>
          <div className="field-row">
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="ag-owner">Owner</label>
              <input id="ag-owner" type="text" placeholder="Enter owner name" defaultValue="Ashmeet Chaurasia" />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="ag-city">Location</label>
              <input id="ag-city" type="text" placeholder="Enter city (optional)" defaultValue="Ludhiana, Punjab" />
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="card-title" style={{ marginBottom: 14 }}>
            Connections
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-row-label">
                <span className="status-dot" style={{ background: '#22A874' }} />
                Google Workspace
              </div>
              <div className="settings-row-note">Drive Shared Drive &amp; OAuth sign-in</div>
            </div>
            <Tag variant="mint">Connected</Tag>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-row-label">
                <span className="status-dot" style={{ background: '#22A874' }} />
                Backblaze B2
              </div>
              <div className="settings-row-note">Edited cuts &amp; voice notes</div>
            </div>
            <Tag variant="mint">Connected</Tag>
          </div>
          <div style={{ paddingTop: 14 }}>
            <div className="settings-row-label">Drive storage</div>
            <div className="settings-row-note">Live usage, what is eligible for deletion, and unfinished uploads are in the Storage section below.</div>
          </div>
        </section>
      </div>

      <section style={{ marginTop: 18 }} id="storage">
        <h2 className="card-title" style={{ marginBottom: 12 }}>Storage</h2>
        <StorageView />
      </section>

      <section className="card" style={{ marginTop: 18, padding: 22 }} id="platform-access">
        <div className="card-title" style={{ marginBottom: 8 }}>Platform and support access</div>
        <p className="cm-meta">Whenever RapidArc staff open this workspace for support or change its settings, it is recorded here with the time and, for support, how long.</p>
        {!(platform ?? []).length ? <p className="cm-meta" style={{ marginTop: 10 }}>No platform access has been recorded.</p> : <div style={{ overflowX: 'auto' }}><table className="data-table" style={{ width: '100%', marginTop: 10 }}>
          <thead><tr><th>When</th><th>What</th><th>Detail</th></tr></thead>
          <tbody>{(platform ?? []).map((entry) => {
            const meta = (entry.metadata ?? {}) as { reason?: string; duration_seconds?: number }
            return <tr key={entry.id}><td>{new Date(entry.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}</td>
              <td>{entry.action.replaceAll('_', ' ')}</td>
              <td>{meta.reason ?? ''}{meta.duration_seconds != null ? ` · lasted ${Math.max(1, Math.round(meta.duration_seconds / 60))} min` : ''}</td></tr>
          })}</tbody></table></div>}
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <div className="card-head">
          <div className="card-title">Team members</div>
          <div className="card-tools">
            <InviteMemberButton />
          </div>
        </div>
        <DataTable columns={columns} rows={team} rowKey={(m) => m.id} />
      </section>
    </>
  )
}
