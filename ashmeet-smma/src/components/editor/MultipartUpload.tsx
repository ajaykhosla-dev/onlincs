'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const PART_SIZE = 8 * 1024 * 1024
const MAX_SIZE = 200 * 1024 * 1024
type Target = { kind: 'cut'; itemId: string } | { kind: 'library'; clientId: string; folderName: string }
type Session = { id: string; partSize: number; uploadedParts?: number }
class UploadRequestError extends Error { constructor(message: string, public sessionId?: string) { super(message) } }

async function post(path: string, data: unknown) {
  const response = await fetch(`/api/media-upload/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data), cache: 'no-store' })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new UploadRequestError(payload.message ?? `Upload ${path} failed (${response.status})`,payload.sessionId)
  return payload
}

function putPart(url: string, blob: Blob, progress: (loaded: number) => void, setActive: (request: XMLHttpRequest | null) => void) {
  return new Promise<void>((resolve,reject) => {
    const request = new XMLHttpRequest()
    setActive(request)
    request.open('PUT',url)
    request.upload.onprogress = (event) => { if (event.lengthComputable) progress(event.loaded) }
    request.onload = () => {
      setActive(null)
      if (request.status >= 200 && request.status < 300) resolve()
      else reject(new Error(`B2 rejected this part (${request.status})`))
    }
    request.onerror = () => { setActive(null); reject(new Error('Network interrupted. Retry to continue this upload.')) }
    request.onabort = () => { setActive(null); reject(new Error('Upload paused')) }
    request.send(blob)
  })
}

function videoDuration(file: File): Promise<number> {
  return new Promise((resolve,reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    const timer = window.setTimeout(() => finish(new Error('Could not read MP4 duration. Re-export with faststart.')),10000)
    function finish(error?: Error) {
      const duration = video.duration
      window.clearTimeout(timer); video.onloadedmetadata = null; video.onerror = null
      video.removeAttribute('src'); video.load(); URL.revokeObjectURL(url)
      if (error) reject(error)
      else resolve(Math.round(duration))
    }
    video.onloadedmetadata = () => Number.isFinite(video.duration) ? finish() : finish(new Error('MP4 duration is invalid. Re-export the cut.'))
    video.onerror = () => finish(new Error('Could not read MP4 metadata. Re-export as H.264/AAC with faststart.'))
    video.preload = 'metadata'; video.src = url
  })
}

export function MultipartUpload({ target, onComplete }: { target: Target; onComplete?: () => void }) {
  const router = useRouter()
  const [file,setFile] = useState<File | null>(null)
  const [error,setError] = useState('')
  const [phase,setPhase] = useState<'idle'|'uploading'|'completing'|'paused'|'complete'>('idle')
  const [progress,setProgress] = useState(0)
  const [mustCancel,setMustCancel] = useState(false)
  const [completionPending,setCompletionPending] = useState(false)
  const session = useRef<Session | null>(null)
  const nextPart = useRef(1)
  const activeRequest = useRef<XMLHttpRequest | null>(null)
  const cancelRequested = useRef(false)

  function choose(selected: File | null) {
    if (!selected) return
    if (session.current) { setError('Cancel the current upload before choosing another file.'); return }
    if (selected.size >= MAX_SIZE) { setError('Files must be under 200MB.'); return }
    if (!selected.size) { setError('Choose a non-empty file.'); return }
    if (target.kind === 'cut' && (!/\.mp4$/i.test(selected.name) || selected.type && selected.type !== 'video/mp4')) {
      setError('Finished cuts must be MP4 files. Export as H.264 video with AAC audio.'); return
    }
    setFile(selected); setError(''); setProgress(0); setMustCancel(false); setCompletionPending(false); nextPart.current = 1; setPhase('idle')
  }

  async function start() {
    if (!file || phase === 'uploading') return
    cancelRequested.current = false
    setPhase('uploading'); setError('')
    try {
      const durationSeconds = target.kind === 'cut' ? await videoDuration(file) : undefined
      if (cancelRequested.current) return
      if (!session.current) {
        session.current = await post('start', { ...target, fileName: file.name, fileSize: file.size,
          contentType: target.kind === 'cut' ? 'video/mp4' : file.type || 'application/octet-stream' })
        nextPart.current = (session.current?.uploadedParts ?? 0)+1
        setProgress(Math.round(Math.min((nextPart.current-1)*PART_SIZE,file.size)/file.size*100))
      }
      if (cancelRequested.current) {
        if (session.current) await post('abort',{ sessionId:session.current.id })
        session.current = null
        return
      }
      const count = Math.ceil(file.size/PART_SIZE)
      for (let part = nextPart.current; part <= count; part++) {
        if (cancelRequested.current) throw new Error('Upload cancelled')
        const blob = file.slice((part-1)*PART_SIZE,Math.min(part*PART_SIZE,file.size))
        let uploaded = false
        for (let attempt = 0; attempt < 3 && !uploaded; attempt++) {
          try {
            const signed = await post('part',{ sessionId: session.current!.id, partNumber: part })
            await putPart(signed.url,blob,(loaded) => setProgress(Math.round((part-1)*PART_SIZE+loaded)/file.size*100),
              (request) => { activeRequest.current = request })
            uploaded = true
          } catch (cause) {
            if (cancelRequested.current || attempt === 2) throw cause
            await new Promise((resolve) => setTimeout(resolve,1000*(attempt+1)))
          }
        }
        nextPart.current = part+1
        setProgress(Math.round(Math.min(part*PART_SIZE,file.size)/file.size*100))
      }
      const assetKind = target.kind === 'library' ? (file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'image' : file.type.startsWith('audio/') ? 'audio' : 'document') : undefined
      setPhase('completing')
      setCompletionPending(true)
      await post('complete',{ sessionId: session.current!.id, assetKind, durationSeconds })
      session.current = null
      setPhase('complete'); setProgress(100); setCompletionPending(false)
      onComplete?.(); router.refresh()
    } catch (cause) {
      if (!cancelRequested.current) {
        if (cause instanceof UploadRequestError && cause.sessionId) { session.current = { id:cause.sessionId,partSize:PART_SIZE }; setMustCancel(true) }
        setError(cause instanceof Error ? cause.message : 'Upload failed'); setPhase('paused')
      }
    }
  }

  async function cancel() {
    cancelRequested.current = true
    activeRequest.current?.abort()
    const current = session.current
    if (current) {
      try { await post('abort',{ sessionId: current.id }) }
      catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not cancel upload'); setPhase('paused'); return }
    }
    session.current = null; nextPart.current = 1; setProgress(0); setFile(null); setPhase('idle'); setError(''); setMustCancel(false); setCompletionPending(false)
  }

  return <div className="upload-area">
    <p>{target.kind === 'cut' ? 'Upload finished cut' : 'Upload library asset'}</p>
    <div className="upload-spec">{target.kind === 'cut' ? 'H.264 MP4 · AAC audio · faststart · under 200MB' : 'Upload directly to private B2 storage · under 200MB'}</div>
    <input type="file" accept={target.kind === 'cut' ? '.mp4,video/mp4' : undefined} aria-label="Choose media file"
      disabled={phase === 'uploading'} onChange={(event) => { choose(event.target.files?.[0] ?? null); event.currentTarget.value = '' }} style={{ marginTop: 14 }} />
    {file && <p style={{ marginTop: 12 }}>{file.name} · {(file.size/1048576).toFixed(1)} MB</p>}
    {file && <><progress value={progress} max={100} style={{ width: '100%',marginTop:12 }} aria-label="Upload progress" />
      <div>{progress.toFixed(0)}% {phase === 'complete' ? 'complete' : phase === 'paused' ? 'paused' : ''}</div></>}
    {error && <p role="alert" style={{ color: '#a11942',marginTop:10 }}>{error}</p>}
    <div style={{ display:'flex',gap:8,justifyContent:'center',marginTop:12 }}>
      <button type="button" className="btn-dark" disabled={!file || mustCancel || phase === 'uploading' || phase === 'completing' || phase === 'complete'} onClick={start}>
        {phase === 'paused' ? 'Retry upload' : 'Start upload'}</button>
      {file && phase !== 'complete' && phase !== 'completing' && !completionPending && <button type="button" className="btn-soft" onClick={cancel}>Cancel</button>}
    </div>
  </div>
}
