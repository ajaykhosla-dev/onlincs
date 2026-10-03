'use client'

import { useState } from 'react'

// Deliberately crude Phase 0 harness for the upload wrapper. Chunks go straight from the browser to
// Google's session URI with NO Authorization header; only the three /api/upload calls touch our server.
const CHUNK = 8 * 1024 * 1024 // must be a multiple of 256 KiB

export default function UploadTestPage() {
  const [file, setFile] = useState<File | null>(null)
  const [shootId, setShootId] = useState('sh-1')
  const [contentItemId, setContentItemId] = useState('ci-1')
  const [pct, setPct] = useState(0)
  const [logs, setLogs] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const log = (m: string) => setLogs((l) => [...l, `${new Date().toLocaleTimeString()}  ${m}`])

  async function api<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T & { error?: string; recoverable?: boolean } }> {
    const res = await fetch(url, init)
    return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) }
  }

  async function startFresh(f: File) {
    const r = await api<{ sessionId: string; sessionUri: string }>('/api/upload/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shootId, contentItemId, fileName: f.name, fileSizeBytes: f.size, mimeType: f.type || 'application/octet-stream' }),
    })
    if (!r.ok) throw new Error(`session create failed: ${r.status} ${r.data.error}`)
    log(`new session ${r.data.sessionId}`)
    return { sessionId: r.data.sessionId, sessionUri: r.data.sessionUri, held: 0 }
  }

  async function resumeOrStart(f: File) {
    const found = await api<{ sessionId: string | null }>(
      `/api/upload/session?shootId=${encodeURIComponent(shootId)}&contentItemId=${encodeURIComponent(contentItemId)}&fileName=${encodeURIComponent(f.name)}&fileSizeBytes=${f.size}`
    )
    const saved = found.ok ? found.data.sessionId : null
    if (saved) {
      const p = await api<{ sessionUri: string; bytesReceived: number }>(`/api/upload/progress?sessionId=${saved}`)
      if (p.ok) {
        log(`resuming ${saved}: Google holds ${p.data.bytesReceived} bytes`)
        return { sessionId: saved, sessionUri: p.data.sessionUri, held: p.data.bytesReceived }
      }
      if (p.data.recoverable) log('session expired — starting a fresh one')
      else throw new Error(`progress failed: ${p.status} ${p.data.error}`)
    }
    return startFresh(f)
  }

  async function upload() {
    if (!file || busy) return // a double-click would otherwise open several Drive sessions for one file
    setBusy(true)
    setLogs([])
    try {
      const { sessionId, sessionUri, held } = await resumeOrStart(file)
      let offset = held
      while (offset < file.size) {
        const end = Math.min(offset + CHUNK, file.size)
        const res = await fetch(sessionUri, {
          method: 'PUT',
          headers: { 'Content-Range': `bytes ${offset}-${end - 1}/${file.size}` },
          body: file.slice(offset, end),
        })
        if (res.status === 308) {
          const m = res.headers.get('Range')?.match(/bytes=0-(\d+)/)
          offset = m ? Number(m[1]) + 1 : 0
        } else if (res.status === 200 || res.status === 201) {
          const done = (await res.json()) as { id: string }
          setPct(100)
          log(`Google accepted the file: ${done.id}`)
          const c = await api<{ rawFileId: string; driveLink: string }>('/api/upload/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, driveFileId: done.id }),
          })
          if (!c.ok) throw new Error(`complete failed: ${c.status} ${c.data.error}`)
          log(`recorded raw_files row ${c.data.rawFileId} → ${c.data.driveLink}`)
          return
        } else {
          throw new Error(`chunk PUT failed: ${res.status}`)
        }
        setPct(Math.round((offset / file.size) * 100))
      }
    } catch (e) {
      log(`ERROR ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main style={{ maxWidth: 640, margin: '40px auto', padding: 16, fontFamily: 'sans-serif' }}>
      <h1>Upload wrapper test (Phase 0)</h1>
      <p>Sign in as a cameraman assigned to the shoot. Close the tab mid-upload, reopen, re-pick the same file to resume.</p>
      <label>Shoot id <input value={shootId} onChange={(e) => setShootId(e.target.value)} /></label>{' '}
      <label>Content item id <input value={contentItemId} onChange={(e) => setContentItemId(e.target.value)} /></label>
      <p><input type="file" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPct(0) }} /></p>
      <progress value={pct} max={100} style={{ width: '100%' }} /> {pct}%
      <p><button onClick={upload} disabled={!file || busy}>Upload / resume</button></p>
      <pre style={{ background: '#111', color: '#7f7', padding: 12, maxHeight: 320, overflow: 'auto' }}>{logs.join('\n')}</pre>
    </main>
  )
}
