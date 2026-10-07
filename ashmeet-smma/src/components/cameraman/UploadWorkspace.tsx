'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { ShootView } from '@/lib/phase4/data'

type Active = { id: string; shoot_id: string; content_item_id: string; file_name: string; file_size_bytes: number; bytes_received: number; expires_at: string; status: string }
type Queued = { key: string; file: File; shootId: string; contentItemId: string; resumeId?: string; progress: number; state: 'queued'|'uploading'|'complete'|'failed'; detail?: string; error?: string }
const CHUNK = 8 * 1024 * 1024 // multiple of Google's 256 KiB granularity
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const pct = (a: number, b: number) => b > 0 ? Math.round(a / b * 100) : 0

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(45000) })
  } catch (error) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError'))
      throw new Error(`The server did not answer ${url.split('?')[0]} within 45 seconds. Please retry.`)
    throw error
  }
  const data = await response.json().catch(() => ({})) as T & { message?: string }
  if (!response.ok) throw new Error(data.message ?? `Request failed (${response.status})`)
  return data
}

export function UploadWorkspace() {
  const params = useSearchParams()
  const [shoots, setShoots] = useState<ShootView[]>([])
  const [sessions, setSessions] = useState<Active[]>([])
  const [shootId, setShootId] = useState(params.get('shoot') ?? '')
  const [itemId, setItemId] = useState(params.get('item') ?? '')
  const [queue, setQueue] = useState<Queued[]>([])
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const clipsRef = useRef<HTMLInputElement>(null)
  const resumeRef = useRef<HTMLInputElement>(null)
  const [resumeTarget, setResumeTarget] = useState<Active | null>(null)
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [shootData, activeData] = await Promise.all([
        json<{ shoots: ShootView[] }>('/api/shoots'),
        json<{ sessions: Active[] }>('/api/upload/active'),
      ])
      setShoots(shootData.shoots.filter((s) => s.status !== 'cancelled'))
      const refreshed = await Promise.all(activeData.sessions.map(async (session) => {
        if (session.status === 'expired') return session
        try {
          const current = await json<{bytesReceived:number}>(`/api/upload/progress?sessionId=${encodeURIComponent(session.id)}`)
          return { ...session, bytes_received: current.bytesReceived }
        } catch (e) { return { ...session, status: e instanceof Error && e.message.toLowerCase().includes('expired') ? 'expired' : session.status } }
      }))
      setSessions(refreshed)
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load uploads') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { queueMicrotask(() => void load()) }, [load])
  const selectedShoot = shoots.find((s) => s.id === shootId)
  const ideas = selectedShoot?.ideas ?? []
  const selectedIdea = ideas.find((idea) => idea.content_item_id === itemId)
  const chooseBlockedReason = loading ? 'Loading shoots and ideas…'
    : !shoots.length ? 'No shoots are available for upload.'
    : !selectedShoot ? 'Choose a shoot first.'
    : selectedShoot.folder_status !== 'complete' ? 'This shoot’s Drive folder is still pending. Ask your Brand Manager to retry folder provisioning.'
    : !ideas.length ? 'This shoot has no linked ideas. Ask your Brand Manager to add one.'
    : !selectedIdea ? 'Choose an idea for these clips.'
    : busy ? 'Wait for the current upload to finish.' : ''
  const totalBytes = queue.reduce((sum, q) => sum + q.file.size, 0)
  const doneBytes = queue.reduce((sum, q) => sum + Math.round(q.file.size * q.progress / 100), 0)
  function addFiles(files: FileList | null) {
    const selectedFiles = Array.from(files ?? [])
    if (!selectedFiles.length || !shootId || !itemId) return
    const entries = selectedFiles.map((file) => ({ key: crypto.randomUUID(), file, shootId, contentItemId: itemId, progress: 0, state: 'queued' as const }))
    setQueue((old) => [...old, ...entries])
  }
  function chooseResume(session: Active) { setResumeTarget(session); resumeRef.current?.click() }
  function pickedResume(file: File | undefined) {
    if (!file || !resumeTarget) return
    if (file.size !== resumeTarget.file_size_bytes || file.name !== resumeTarget.file_name) {
      setError(`Choose the same file: ${resumeTarget.file_name} (${resumeTarget.file_size_bytes} bytes). The selected file does not match.`)
      return
    }
    setQueue((old) => [...old, { key: crypto.randomUUID(), file, shootId: resumeTarget.shoot_id, contentItemId: resumeTarget.content_item_id, resumeId: resumeTarget.id,
      progress: pct(resumeTarget.bytes_received,file.size), state: 'queued' }])
    setResumeTarget(null); setError('')
  }
  function update(key: string, patch: Partial<Queued>) { setQueue((old) => old.map((q) => q.key === key ? { ...q, ...patch } : q)) }
  async function complete(sessionId: string, driveFileId: string) {
    await json('/api/upload/complete', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ sessionId, driveFileId }) })
  }
  async function uploadOne(q: Queued) {
    update(q.key,{state:'uploading',detail:'Preparing upload session…',error:undefined})
    let sessionId = q.resumeId
    let sessionUri = ''
    let offset = 0
    if (!sessionId) {
      const found = await json<{sessionId:string|null}>(`/api/upload/session?shootId=${encodeURIComponent(q.shootId)}&contentItemId=${encodeURIComponent(q.contentItemId)}&fileName=${encodeURIComponent(q.file.name)}&fileSizeBytes=${q.file.size}`)
      sessionId = found.sessionId ?? undefined
    }
    if (sessionId) {
      try {
        const progress = await json<{sessionUri:string;bytesReceived:number;completedDriveFileId?:string}>(`/api/upload/progress?sessionId=${encodeURIComponent(sessionId)}`)
        if (progress.completedDriveFileId) { await complete(sessionId,progress.completedDriveFileId); update(q.key,{state:'complete',progress:100}); return }
        sessionUri = progress.sessionUri; offset = progress.bytesReceived
      } catch (e) {
        if (!(e instanceof Error) || !e.message.toLowerCase().includes('expired')) throw e
        sessionId = undefined // expired: request a fresh session for the same selected file
      }
    }
    if (!sessionId) {
      update(q.key,{detail:'Creating Drive upload session…'})
      const created = await json<{sessionId:string;sessionUri:string}>('/api/upload/session', { method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({shootId:q.shootId,contentItemId:q.contentItemId,fileName:q.file.name,fileSizeBytes:q.file.size,mimeType:q.file.type || 'application/octet-stream'}) })
      sessionId=created.sessionId; sessionUri=created.sessionUri
    }
    while (offset < q.file.size) {
      const end = Math.min(offset + CHUNK, q.file.size)
      let response: Response | null = null
      for (let attempt=0;attempt<8;attempt++) {
        update(q.key,{detail:attempt ? `Retrying clip transfer (${attempt + 1}/8)…` : `Sending clip to Drive (${pct(offset,q.file.size)}%)…`})
        try {
          response = await fetch(sessionUri,{method:'PUT',headers:{'Content-Range':`bytes ${offset}-${end-1}/${q.file.size}`},body:q.file.slice(offset,end)})
        } catch (e) {
          if (attempt===7) throw e
        }
        if (response?.status===308 || response?.ok) break
        if (response?.status===404 || response?.status===410) throw new Error('Upload session expired. Re-pick the file to start fresh.')
        if (response && response.status<500 && response.status!==429) throw new Error(`Drive rejected the chunk (${response.status})`)
        await sleep(Math.min(1000 * 2 ** attempt,30000))
        try {
          const progress = await json<{sessionUri:string;bytesReceived:number;completedDriveFileId?:string}>(`/api/upload/progress?sessionId=${encodeURIComponent(sessionId)}`)
          if (progress.completedDriveFileId) { await complete(sessionId,progress.completedDriveFileId); update(q.key,{state:'complete',progress:100}); return }
          offset=progress.bytesReceived; sessionUri=progress.sessionUri
          if (offset>=end) { response=null; break }
        } catch (e) { if (attempt===7) throw e; response=null; continue }
      }
      if (!response) { update(q.key,{progress:pct(offset,q.file.size)}); continue }
      if (response.status===308) {
        const matched=response.headers.get('Range')?.match(/bytes=0-(\d+)/)
        const nextOffset=matched?Number(matched[1])+1:0
        if (nextOffset<=offset) throw new Error('Drive did not accept this chunk. Please retry the upload.')
        offset=nextOffset
      } else if (response.ok) {
        update(q.key,{detail:'Recording uploaded clip…'})
        const driveFile = await response.json() as {id?:string}
        if (!driveFile.id) throw new Error('Drive did not return a file id')
        await complete(sessionId,driveFile.id)
        update(q.key,{state:'complete',progress:100}); return
      } else throw new Error(`Drive rejected the chunk (${response.status})`)
      update(q.key,{progress:pct(offset,q.file.size)})
    }
    const finalProgress = await json<{completedDriveFileId?:string}>(`/api/upload/progress?sessionId=${encodeURIComponent(sessionId)}`)
    if (!finalProgress.completedDriveFileId) throw new Error('Drive has the file, but its file id was not returned. Retry completion later.')
    await complete(sessionId,finalProgress.completedDriveFileId)
    update(q.key,{state:'complete',progress:100})
  }
  async function start() {
    if (busy) return
    const candidates=queue.filter((q)=>q.state==='queued'||q.state==='failed')
    if (!candidates.length) return
    const connection=(navigator as Navigator & {connection?:{saveData?:boolean;effectiveType?:string}}).connection
    if ((connection?.saveData || candidates.some((q)=>q.file.size>1024**3)) && !window.confirm('Large uploads may use a lot of data. Keep this tab open until the queue finishes. Continue?')) return
    setBusy(true); setError('')
    for (const q of candidates) {
      try { await uploadOne(q) }
      catch (e) { update(q.key,{state:'failed',error:e instanceof Error?e.message:'Upload failed'}); setError('An upload paused. Re-pick the same file later to resume.'); break }
    }
    setBusy(false); void load()
  }
  return <section id="screen-upload" style={{padding:'24px',maxWidth:900,margin:'0 auto'}}>
    <div className="page-head"><h1>Upload raw footage</h1><p>Choose a shoot and idea, then choose clips. Keep this tab open while they upload directly to the agency Drive.</p></div>
    {loading?<p role="status">Loading shoots and saved uploads…</p>:null}
    {error?<p role="alert" style={{color:'var(--pink-ink)'}}>{error}</p>:null}
    <div className="card" style={{padding:20,display:'grid',gap:14}}>
      <div className="field-row"><label className="field">Shoot <span className="req">*</span><select value={shootId} onChange={(e)=>{setShootId(e.target.value);setItemId('')}}><option value="">Choose shoot</option>{shoots.map((shoot)=><option key={shoot.id} value={shoot.id}>{shoot.client.name} · {shoot.title}{shoot.folder_status === 'complete' ? ' · Folder ready' : ' · Folder pending'}</option>)}</select></label>
      <label className="field">Idea <span className="req">*</span><select value={itemId} disabled={!selectedShoot || !ideas.length} onChange={(e)=>setItemId(e.target.value)}><option value="">Choose idea</option>{ideas.map((idea)=><option key={idea.content_item_id} value={idea.content_item_id}>{idea.item.title}</option>)}</select></label></div>
      {chooseBlockedReason?<p role="status" style={{margin:0}}>{chooseBlockedReason}</p>:<p role="status" style={{margin:0}}>Ready to choose clips for {selectedIdea?.item.title}.</p>}
      <button type="button" className="btn-soft" style={{width:'fit-content'}} disabled={!!chooseBlockedReason} onClick={()=>clipsRef.current?.click()}>Choose clips</button>
      <input ref={clipsRef} type="file" multiple aria-label="Select clips to upload" style={{display:'none'}} onChange={(e)=>{addFiles(e.target.files);e.target.value=''}} />
    </div>
    <h2>Upload queue</h2><div className="card" style={{padding:20}}>{queue.length?queue.map((q)=><div key={q.key} style={{padding:'12px 0',borderBottom:'1px solid var(--line)'}}><strong>{q.file.name}</strong><p>{shoots.find((s)=>s.id===q.shootId)?.client.name} · {shoots.find((s)=>s.id===q.shootId)?.ideas.find((i)=>i.content_item_id===q.contentItemId)?.item.title} · {q.state}</p>{q.state==='uploading'&&q.detail?<p role="status">{q.detail}</p>:null}<progress max={100} value={q.progress} style={{width:'100%'}} /> <span>{q.progress}%</span>{q.error&&<p role="alert">{q.error}</p>}</div>):<p>No clips queued yet.</p>}<p>Overall: {pct(doneBytes,totalBytes)}%</p><progress max={100} value={pct(doneBytes,totalBytes)} style={{width:'100%'}} /><p><button className="btn-dark" disabled={busy||!queue.some((q)=>q.state==='queued'||q.state==='failed')} onClick={()=>void start()}>{busy?'Uploading…':'Start queue'}</button></p></div>
    <h2>Resume uploads</h2><div className="card" style={{padding:20}}>{sessions.length?sessions.map((s)=><div key={s.id} style={{padding:'12px 0',borderBottom:'1px solid var(--line)'}}><strong>{s.file_name}</strong><p>{s.status==='expired'?'Session expired — start fresh':'Active'} · {pct(s.bytes_received,s.file_size_bytes)}%</p><button className="btn-soft" onClick={()=>chooseResume(s)}>Resume — choose the same file again</button></div>):<p>No interrupted uploads.</p>}</div>
    <input ref={resumeRef} type="file" style={{display:'none'}} onChange={(e)=>{pickedResume(e.target.files?.[0]);e.target.value=''}} />
  </section>
}
