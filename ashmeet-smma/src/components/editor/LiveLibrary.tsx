'use client'

import { useState } from 'react'
import { MultipartUpload } from './MultipartUpload'

type Client = { id: string; name: string }
type Asset = { id: string; client_id: string; folder_name: string; name: string; kind: string; file_size_bytes: number | null; created_at: string }

export function LiveLibrary({ clients,assets }: { clients: Client[]; assets: Asset[] }) {
  const [selected,setSelected] = useState<string | null>(null)
  const [folder,setFolder] = useState('General')
  const [error,setError] = useState('')
  const client = clients.find((entry) => entry.id === selected)

  async function download(id: string) {
    setError('')
    try {
      const response = await fetch(`/api/media/play?assetId=${encodeURIComponent(id)}`,{ cache:'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message ?? 'Could not open asset')
      window.location.assign(data.url)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not open asset') }
  }

  return <section style={{ padding:28,overflowY:'auto' }}>
    <header className="hero-row" style={{ gridTemplateColumns:'1fr' }}><div className="hello"><h1>Library</h1>
      <p>Reusable B-roll, logos, music, and documents in private B2 storage.</p></div></header>
    {error && <p role="alert" style={{ color:'#a11942' }}>{error}</p>}
    <div className="folder-grid">{clients.map((entry) => {
      const own = assets.filter((asset) => asset.client_id === entry.id)
      const newest = own[0]?.created_at
      return <button type="button" key={entry.id} className="folder" onClick={() => setSelected(entry.id)} style={{ textAlign:'left',cursor:'pointer' }}>
        <div className="folder-name">{entry.name}</div><div className="folder-meta">{own.length} items · {newest ? `updated ${new Date(newest).toLocaleDateString('en-IN')}` : 'Nothing uploaded yet'}</div>
      </button>
    })}</div>
    {!clients.length && <div className="card" style={{ padding:24 }}>No assigned client libraries yet.</div>}
    {client && <div className="card" style={{ padding:24,marginTop:20 }}>
      <button type="button" className="btn-soft" onClick={() => setSelected(null)}>Back to clients</button>
      <h2>{client.name}</h2>
      <label>Folder name<input value={folder} maxLength={80} onChange={(event) => setFolder(event.target.value)} style={{ display:'block',padding:10,marginTop:6 }} /></label>
      {folder.trim() && <MultipartUpload key={`${client.id}-${folder}`} target={{ kind:'library',clientId:client.id,folderName:folder.trim() }} />}
      <h3>Assets</h3>
      {!assets.some((asset) => asset.client_id === client.id) && <p>No assets uploaded yet.</p>}
      {Object.entries(Object.groupBy(assets.filter((asset) => asset.client_id === client.id),(asset) => asset.folder_name)).map(([name,group]) =>
        <div key={name}><h4>{name}</h4>{group?.map((asset) => <div key={asset.id} style={{ display:'flex',justifyContent:'space-between',gap:12,padding:'8px 0' }}>
          <span>{asset.name} · {asset.kind} · {asset.file_size_bytes == null ? 'size unknown' : `${(asset.file_size_bytes/1048576).toFixed(1)} MB`}</span>
          <button type="button" className="btn-soft" onClick={() => download(asset.id)}>Download</button>
        </div>)}</div>)}
    </div>}
  </section>
}
