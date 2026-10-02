'use client'

export default function AdminSettingsPage() {
  return (
    <div>
      <h1 className="card-title mb-6">Settings</h1>
      <div className="settings-grid">
        <div className="card">
          <div className="card-head">
            <h2 className="card-title">Agency</h2>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-row-label">Agency Name</div>
              <div className="settings-row-note">Ashmeet SMMA</div>
            </div>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-row-label">Slug</div>
              <div className="settings-row-note">ashmeet-smma</div>
            </div>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-row-label">Status</div>
              <div className="settings-row-note">Active</div>
            </div>
            <span className="status-dot bg-green-500" />
          </div>
        </div>
        <div className="card">
          <div className="card-head">
            <h2 className="card-title">Integrations</h2>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-row-label">Google Drive</div>
              <div className="settings-row-note">Shared Drive configured</div>
            </div>
            <span className="status-dot bg-green-500" />
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-row-label">Backblaze B2</div>
              <div className="settings-row-note">Bucket: rapidarc-cuts-ashmeet</div>
            </div>
            <span className="status-dot bg-yellow-500" />
          </div>
        </div>
      </div>
    </div>
  )
}
