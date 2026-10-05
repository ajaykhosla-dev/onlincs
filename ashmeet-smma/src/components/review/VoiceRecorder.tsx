'use client'

import { useEffect, useRef, useState } from 'react'

export const VOICE_MAX_SECONDS = 120
export type Recording = { blob: Blob; url: string; ext: 'webm' | 'mp4'; contentType: string; seconds: number }

function pickFormat(): { mime: string; ext: 'webm' | 'mp4'; contentType: string } | null {
  if (typeof MediaRecorder === 'undefined') return null
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return { mime: 'audio/webm;codecs=opus', ext: 'webm', contentType: 'audio/webm' }
  if (MediaRecorder.isTypeSupported('audio/webm')) return { mime: 'audio/webm', ext: 'webm', contentType: 'audio/webm' }
  if (MediaRecorder.isTypeSupported('audio/mp4')) return { mime: 'audio/mp4', ext: 'mp4', contentType: 'audio/mp4' }
  return null
}
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

/** Records in the browser and hands the finished clip up; it stops by itself at two minutes. */
export function VoiceRecorder({ recording, onRecorded, disabled }: {
  recording: Recording | null; onRecorded: (value: Recording | null) => void; disabled?: boolean
}) {
  const [state, setState] = useState<'idle' | 'recording'>('idle')
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState('')
  const recorder = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current)
    if (recorder.current?.state === 'recording') recorder.current.stop()
    stream.current?.getTracks().forEach((track) => track.stop())
  }, [])

  async function start() {
    setError('')
    const format = pickFormat()
    if (!format || !navigator.mediaDevices?.getUserMedia) { setError('This browser cannot record audio. Try Chrome, Edge, Firefox or Safari.'); return }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (cause) {
      const name = cause instanceof DOMException ? cause.name : ''
      setError(name === 'NotAllowedError' || name === 'SecurityError'
        ? 'Microphone access is blocked. Allow the microphone for this site in your browser settings, then try again.'
        : name === 'NotFoundError' ? 'No microphone was found on this device.' : 'The microphone could not be started.')
      return
    }
    const chunks: Blob[] = []
    const instance = new MediaRecorder(stream.current, { mimeType: format.mime })
    recorder.current = instance
    instance.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data) }
    const startedAt = Date.now()
    instance.onstop = () => {
      if (timer.current) clearInterval(timer.current)
      stream.current?.getTracks().forEach((track) => track.stop())
      setState('idle')
      const elapsed = Math.min(VOICE_MAX_SECONDS, Math.round((Date.now() - startedAt) / 1000))
      if (chunks.length) { const blob = new Blob(chunks, { type: format.contentType }); onRecorded({ blob, url: URL.createObjectURL(blob), ext: format.ext, contentType: format.contentType, seconds: elapsed }) }
    }
    onRecorded(null); setSeconds(0); setState('recording'); instance.start()
    timer.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000)
      setSeconds(Math.min(elapsed, VOICE_MAX_SECONDS))
      if (elapsed >= VOICE_MAX_SECONDS && instance.state === 'recording') instance.stop()
    }, 250)
  }

  function stop() { if (recorder.current?.state === 'recording') recorder.current.stop() }

  return <div className="vr">
    {state === 'recording' ? <div className="vr-row">
      <span className="vr-dot" aria-hidden="true" /><span role="timer" aria-label="Recording time">{clock(seconds)} / {clock(VOICE_MAX_SECONDS)}</span>
      <button type="button" className="btn-soft" onClick={stop}>Stop</button>
    </div> : recording ? <div className="vr-row">
      <audio controls src={recording.url} aria-label="Preview your voice note" />
      <span>{clock(recording.seconds)}</span>
      <button type="button" className="btn-soft" disabled={disabled} onClick={() => onRecorded(null)}>Discard</button>
    </div> : <button type="button" className="btn-soft" disabled={disabled} onClick={() => void start()}>Record voice note</button>}
    {error && <p role="alert" className="rv-error">{error}</p>}
  </div>
}
