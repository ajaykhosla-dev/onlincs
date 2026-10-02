'use client'

import { useState, useRef } from 'react'

export default function UploadTestPage() {
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('Pick a file to test the upload wrapper')
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`])

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      setFile(f)
      setStatus(`Selected: ${f.name} (${(f.size / 1024 / 1024).toFixed(1)} MB)`)
      setProgress(0)
    }
  }

  const handleUpload = async () => {
    if (!file) return
    setStatus('Starting upload...')
    setProgress(0)
    setLogs([])

    try {
      // Step 1: Create session
      addLog('Requesting upload session from server...')
      const sessionRes = await fetch('/api/upload/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, fileSizeBytes: file.size, mimeType: file.type }),
      })

      if (!sessionRes.ok) {
        const err = await sessionRes.text()
        addLog(`Session creation failed: ${sessionRes.status} ${err}`)
        setStatus('Session creation failed')
        return
      }

      const { sessionUri, sessionId } = await sessionRes.json()
      addLog(`Session created: ${sessionId}`)
      addLog(`Session URI received (first 50 chars): ${sessionUri.slice(0, 50)}...`)

      // Step 2: Upload chunks directly to Drive (bypassing server)
      const chunkSize = 256 * 1024 // 256KB chunks for testing
      let uploaded = 0

      while (uploaded < file.size) {
        const end = Math.min(uploaded + chunkSize, file.size)
        const chunk = file.slice(uploaded, end)

        const res = await fetch(sessionUri, {
          method: 'PUT',
          headers: {
            'Content-Length': String(end - uploaded),
            'Content-Range': `bytes ${uploaded}-${end - 1}/${file.size}`,
          },
          body: chunk,
        })

        if (res.status === 308) {
          // Resume — check progress
          const range = res.headers.get('Range')
          if (range) {
            const match = range.match(/bytes=0-(\d+)/)
            if (match) uploaded = parseInt(match[1]) + 1
          }
        } else if (res.status === 200 || res.status === 201) {
          // Complete
          const result = await res.json()
          addLog(`Upload complete! Drive file ID: ${result.id}`)
          setStatus(`Upload complete — file ID: ${result.id}`)
          setProgress(100)
          return
        } else {
          const text = await res.text()
          addLog(`Chunk upload failed: ${res.status} ${text}`)
          setStatus(`Upload failed at byte ${uploaded}`)
          return
        }

        uploaded = end
        const pct = Math.round((uploaded / file.size) * 100)
        setProgress(pct)
      }

      // Step 3: Query final progress
      addLog('Querying final progress...')
      const progressRes = await fetch(`/api/upload/progress?sessionUri=${encodeURIComponent(sessionUri)}`, {
        method: 'PUT',
        headers: { 'Content-Range': `bytes */${file.size}` },
      })

      setStatus('Upload complete!')
    } catch (e) {
      addLog(`Error: ${e instanceof Error ? e.message : String(e)}`)
      setStatus('Upload failed')
    }
  }

  return (
    <div className="min-h-screen p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Upload Wrapper Test</h1>
      <p className="text-gray-400 mb-6 text-sm">
        Tests the Drive resumable upload wrapper. Chunks upload directly to Google Drive — no bytes pass through the server.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Select a large file (500MB+) for best results</label>
          <input
            type="file"
            onChange={handlePick}
            className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-violet-600 file:text-white hover:file:bg-violet-700"
          />
        </div>

        {file && (
          <div className="bg-gray-900 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">{file.name}</span>
              <span className="text-sm text-gray-400">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2 mb-4">
              <div
                className="bg-violet-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-400 mb-4">{status}</p>
            <button
              onClick={handleUpload}
              className="px-6 py-2 bg-violet-600 text-white rounded hover:bg-violet-700 transition-colors"
            >
              Upload to Drive
            </button>
          </div>
        )}

        {logs.length > 0 && (
          <div className="bg-black rounded-lg p-4 font-mono text-xs text-green-400 max-h-96 overflow-y-auto">
            {logs.map((log, i) => (
              <div key={i}>{log}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
