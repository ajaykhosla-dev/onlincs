'use client'
import { TopNav, Tag, EmptyState } from '@/components/shared'
import { libraryAssets, clients } from '@/lib/fixtures'

export default function EditorLibraryPage() {
  const folders = Array.from(new Set(libraryAssets.map(a => `${a.client_id}::${a.folder_name}`)))
  const folderMap = folders.map(key => {
    const [clientId, folderName] = key.split('::')
    const client = clients.find(c => c.id === clientId)
    const items = libraryAssets.filter(a => a.client_id === clientId && a.folder_name === folderName)
    return { clientId, folderName, clientName: client?.name || '—', items }
  })

  return (
    <>
      <TopNav title="Library" tabs={[
          { label: 'To-do', href: '/editor/todo' },
          { label: 'Re-do', href: '/editor/redo' },
          { label: 'Library', href: '#' },
        ]} showSearch searchPlaceholder="Search assets…" />
      <div className="folder-grid">
        {folderMap.map(f => (
          <div key={`${f.clientId}-${f.folderName}`} className="folder">
            <div className="folder-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            </div>
            <div className="folder-name">{f.folderName}</div>
            <div className="folder-meta">{f.clientName} · {f.items.length} items</div>
          </div>
        ))}
      </div>
      {folderMap.length === 0 && <EmptyState title="No assets yet" subtitle="Uploaded raw footage appears here." />}
    </>
  )
}
