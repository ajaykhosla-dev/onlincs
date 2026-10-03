import { clientById } from '@/lib/fixtures/console'
import { libraryFolders } from '@/lib/fixtures/editor'

const FOLDER_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
  </svg>
)

export default function EditorLibraryPage() {
  return (
    <>
      <section className="hero-row" style={{ gridTemplateColumns: '1fr' }}>
        <div className="hello">
          <h1>
            Library<span className="light">Reusable footage, per client</span>
          </h1>
          <p>B-rolls, logo stings, and music beds you can drop into any cut.</p>
        </div>
      </section>

      <div className="folder-grid">
        {libraryFolders.map((f) => {
          const client = clientById(f.clientId)
          if ('empty' in f) {
            return (
              <div key={f.clientId} className="folder" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="folder-icon">{FOLDER_ICON}</div>
                <div className="folder-name">{client?.name}</div>
                <div className="folder-meta" style={{ marginBottom: 12 }}>
                  {f.summary}
                </div>
                <button type="button" className="btn-soft" style={{ justifyContent: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 3v12M7 8l5-5 5 5" />
                    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                  </svg>
                  Upload
                </button>
              </div>
            )
          }
          return (
            <div key={f.clientId} className="folder">
              <div className="folder-icon">{FOLDER_ICON}</div>
              <div className="folder-name">{client?.name}</div>
              <div className="folder-meta">{f.summary}</div>
            </div>
          )
        })}
      </div>
    </>
  )
}
