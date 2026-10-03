import { Avatar, DataTable, Tag, type Column } from '@/components/shared'
import { team, type TeamMember } from '@/lib/fixtures/console'
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
  { header: 'Role', cell: (m) => <Tag variant={settingsRoles[m.role].tone}>{settingsRoles[m.role].label}</Tag> },
  { header: 'Email', cell: (m) => m.email, tdStyle: { fontSize: '12.5px', color: 'var(--ink-soft)' } },
  {
    header: '',
    cell: (m) => (
      <button type="button" className="kebab" aria-label={`Actions for ${m.full_name}`}>
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="12" cy="19" r="1.7" />
        </svg>
      </button>
    ),
  },
]

export default function AdminSettingsPage() {
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
            <input id="ag-name" type="text" defaultValue="Ashmeet SMMA" />
          </div>
          <div className="field">
            <label htmlFor="ag-owner">Owner</label>
            <input id="ag-owner" type="text" defaultValue="Ashmeet Chaurasia" />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="ag-city">Location</label>
            <input id="ag-city" type="text" defaultValue="Ludhiana, Punjab" />
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
            <div className="settings-row-note">1.64 TB of 2 TB used</div>
            <div className="usage-track">
              <span className="usage-fill" style={{ width: '82%', background: 'linear-gradient(90deg,#FFC974,#E8901A)' }} />
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--amber-ink)', fontWeight: 700, marginTop: 8 }}>
              Approaching threshold &mdash; review raw footage eligible for deletion
            </div>
          </div>
        </section>
      </div>

      <section className="card" style={{ marginTop: 18 }}>
        <div className="card-head">
          <div className="card-title">Team members</div>
          <div className="card-tools">
            <button type="button" className="btn-dark" style={{ height: 36, padding: '0 16px' }}>
              Invite member
            </button>
          </div>
        </div>
        <DataTable columns={columns} rows={team} rowKey={(m) => m.id} />
      </section>
    </>
  )
}
