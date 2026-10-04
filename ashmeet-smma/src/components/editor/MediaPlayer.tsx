'use client'

import { useRef, useState } from 'react'

function stamp(seconds: number) { const value = Math.floor(Number.isFinite(seconds) ? seconds : 0); return `${Math.floor(value/60)}:${String(value%60).padStart(2,'0')}` }

export function MediaPlayer({ versionId, title }: { versionId: string; title: string }) {
  const video = useRef<HTMLVideoElement>(null)
  const [src,setSrc] = useState('')
  const [error,setError] = useState('')
  const [faststart,setFaststart] = useState<boolean | null>(null)
  const [current,setCurrent] = useState(0)
  const [duration,setDuration] = useState(0)
  const [playing,setPlaying] = useState(false)

  async function load() {
    setError('')
    try {
      const response = await fetch(`/api/media/play?versionId=${encodeURIComponent(versionId)}`,{ cache:'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message ?? 'Could not load cut')
      setSrc(payload.url); setFaststart(payload.faststart)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load cut') }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const player = video.current
    if (!player || !src) return
    if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault(); if (player.paused) void player.play(); else player.pause()
    } else if (event.key === 'ArrowLeft') { event.preventDefault(); player.currentTime = Math.max(0,player.currentTime-5) }
    else if (event.key === 'ArrowRight') { event.preventDefault(); player.currentTime = Math.min(player.duration || 0,player.currentTime+5) }
    else if (event.key === 'Escape') player.pause()
  }

  return <div tabIndex={0} onKeyDown={onKeyDown} aria-label={`${title} video player`} style={{ outlineOffset: 4 }}>
    {!src ? <button type="button" className="btn-dark" onClick={load}>Load {title}</button>
      : <video ref={video} src={src} controls preload="metadata" playsInline style={{ width:'100%',maxHeight:420,background:'#111',borderRadius:12 }}
        onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onError={() => setError('This cut could not be loaded. Refresh its link or check that the B2 file exists.')} />}
    {src && <div style={{ display:'flex',alignItems:'center',gap:10,marginTop:8 }}>
      <button type="button" className="btn-soft" onClick={() => { if (!video.current) return; if (playing) video.current.pause(); else void video.current.play() }}>{playing ? 'Pause' : 'Play'}</button>
      <input aria-label="Seek video" type="range" min={0} max={Math.max(1,duration)} step="0.1" value={Math.min(current,Math.max(1,duration))}
        onChange={(event) => { if (video.current) video.current.currentTime = Number(event.target.value) }} style={{ flex:1 }} />
      <span>{stamp(current)} / {stamp(duration)}</span>
      <button type="button" className="btn-soft" onClick={load}>Refresh link</button>
    </div>}
    {faststart === false && <p role="status" style={{ color:'#9a5a00' }}>Faststart is missing: this MP4 stores its moov atom after the media data. Re-export with faststart for reliable scrubbing.</p>}
    {error && <p role="alert" style={{ color:'#a11942' }}>{error}</p>}
  </div>
}
