'use client'

import { useCallback, useEffect, useState, type RefObject } from 'react'
import { VoiceRecorder, type Recording } from './VoiceRecorder'
import type { ReviewComment } from '@/lib/phase6/review'

export function stamp(seconds: number) {
  const value = Math.floor(Number.isFinite(seconds) ? seconds : 0)
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`
}
/** `0:11–0:14` for a range, `0:11` for a point, `General` for a comment on the whole cut. */
export function rangeLabel(start: number | null, end: number | null) {
  if (start == null) return 'General'
  return end != null && Math.floor(end) !== Math.floor(start) ? `${stamp(start)}–${stamp(end)}` : stamp(start)
}

type Filter = 'all' | 'unresolved' | 'resolved'
async function readError(response: Response, fallback: string) {
  const payload = await response.json().catch(() => ({}))
  return typeof payload.message === 'string' ? payload.message : fallback
}

function VoiceNote({ comment, canRetry, onChange }: { comment: ReviewComment; canRetry: boolean; onChange: (next: Partial<ReviewComment>) => void }) {
  const [src, setSrc] = useState('')
  const [error, setError] = useState('')
  const [retrying, setRetrying] = useState(false)
  async function load() {
    setError('')
    const response = await fetch(`/api/comments/${comment.id}/voice`, { cache: 'no-store' })
    if (!response.ok) { setError(await readError(response, 'Could not open the voice note.')); return }
    setSrc((await response.json()).url)
  }
  async function retry() {
    setRetrying(true); onChange({ transcript_status: 'pending' })
    try {
      const response = await fetch(`/api/comments/${comment.id}/transcribe`, { method: 'POST' })
      const payload = await response.json().catch(() => ({}))
      onChange({ transcript: payload.transcript ?? null, transcript_status: payload.transcript_status ?? 'failed' })
    } catch { onChange({ transcript_status: 'failed' }) } finally { setRetrying(false) }
  }
  return <div className="cm-voice">
    {src ? <audio controls autoPlay src={src} aria-label="Voice note" onError={() => setError('This voice note could not be played.')} />
      : <button type="button" className="btn-soft" onClick={() => void load()}>Play voice note</button>}
    {error && <p role="alert" className="rv-error">{error}</p>}
    {comment.transcript_status === 'pending' && <p className="cm-transcript" role="status">Transcribing…</p>}
    {comment.transcript_status === 'failed' && <p className="cm-transcript">Transcript unavailable.{' '}
      {canRetry && <button type="button" className="cm-link" disabled={retrying} onClick={() => void retry()}>Retry transcript</button>}</p>}
    {comment.transcript && comment.transcript_status !== 'failed' && comment.transcript_status !== 'pending' &&
      <p className="cm-transcript"><b>Transcript:</b> {comment.transcript}</p>}
  </div>
}

/**
 * Timestamped comments for one cut. Reviewers get the composer (text plus optional range and voice note);
 * an assigned editor sees the same list read-only and may mark comments resolved.
 */
export function CommentsPanel({ versionId, videoRef, canWrite, canRetry, currentUserId, onChanged, readOnlyReason }: {
  versionId: string; videoRef?: RefObject<HTMLVideoElement | null>; canWrite: boolean; canRetry: boolean
  currentUserId: string; onChanged?: (comments: ReviewComment[]) => void; readOnlyReason?: string
}) {
  const [comments, setComments] = useState<ReviewComment[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [body, setBody] = useState('')
  const [rangeEnd, setRangeEnd] = useState<number | null>(null)
  const [recording, setRecordingState] = useState<Recording | null>(null)
  const setRecording = (next: Recording | null) => setRecordingState((previous) => { if (previous) URL.revokeObjectURL(previous.url); return next })
  const [playhead, setPlayhead] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const publish = useCallback((next: ReviewComment[]) => { setComments(next); onChanged?.(next) }, [onChanged])
  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/versions/${versionId}/comments`, { cache: 'no-store' })
      if (!response.ok) throw new Error(await readError(response, 'Could not load comments'))
      publish((await response.json()).comments); setLoadError('')
    } catch (cause) { setLoadError(cause instanceof Error ? cause.message : 'Could not load comments') }
  }, [versionId, publish])
  useEffect(() => { queueMicrotask(() => void load()) }, [load])

  useEffect(() => {
    if (!canWrite) return
    const id = setInterval(() => { if (videoRef?.current) setPlayhead(videoRef.current.currentTime) }, 250)
    return () => clearInterval(id)
  }, [canWrite, videoRef])

  const patch = (id: string, next: Partial<ReviewComment>) =>
    setComments((current) => current && current.map((entry) => entry.id === id ? { ...entry, ...next } : entry))

  async function add() {
    if (!body.trim() && !recording) { setError('Write a comment or record a voice note.'); return }
    const player = videoRef?.current
    // The playhead is read at the moment of adding, rounded to a tenth of a second.
    const start = player ? Math.round(player.currentTime * 10) / 10 : null
    const end = rangeEnd != null && start != null && rangeEnd > start ? rangeEnd : null
    setBusy(true); setError('')
    try {
      let voice: { commentId: string; ext: 'webm' | 'mp4' } | undefined
      if (recording) {
        const presign = await fetch('/api/voice-notes/presign', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ versionId, ext: recording.ext }) })
        if (!presign.ok) throw new Error(await readError(presign, 'Could not prepare the voice note upload'))
        const target = await presign.json()
        const upload = await fetch(target.uploadUrl, { method: 'PUT', headers: { 'Content-Type': target.contentType }, body: recording.blob })
        if (!upload.ok) throw new Error('The voice note could not be uploaded. Try again.')
        voice = { commentId: target.commentId, ext: recording.ext }
      }
      const response = await fetch(`/api/versions/${versionId}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: body.trim(), timestampStart: start, timestampEnd: end, voice }) })
      if (!response.ok) throw new Error(await readError(response, 'Could not save the comment'))
      const { comment } = await response.json() as { comment: ReviewComment }
      publish([...(comments ?? []), comment].sort((a, b) => (a.timestamp_start ?? -1) - (b.timestamp_start ?? -1)))
      setBody(''); setRangeEnd(null); setRecording(null)
      if (comment.has_voice) {
        // The comment is saved; transcription is a separate step and its failure never undoes the comment.
        fetch(`/api/comments/${comment.id}/transcribe`, { method: 'POST' }).then((result) => result.json())
          .then((payload) => patch(comment.id, { transcript: payload.transcript ?? null, transcript_status: payload.transcript_status ?? 'failed' }))
          .catch(() => patch(comment.id, { transcript_status: 'failed' }))
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save the comment') }
    finally { setBusy(false) }
  }

  async function mutate(id: string, request: Promise<Response>, apply: (payload: { comment?: ReviewComment }) => void) {
    setError('')
    try {
      const response = await request
      if (!response.ok) throw new Error(await readError(response, 'That change was not saved'))
      apply(await response.json())
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'That change was not saved') }
  }
  const toggle = (comment: ReviewComment) => mutate(comment.id, fetch(`/api/comments/${comment.id}`, { method: 'PATCH',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resolved: !comment.resolved_at }) }),
    (payload) => { if (payload.comment) publish((comments ?? []).map((entry) => entry.id === comment.id ? payload.comment! : entry)) })
  const saveEdit = (comment: ReviewComment) => mutate(comment.id, fetch(`/api/comments/${comment.id}`, { method: 'PATCH',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: draft }) }),
    (payload) => { if (payload.comment) patch(comment.id, payload.comment); setEditing(null) })
  const remove = (comment: ReviewComment) => {
    if (!window.confirm('Delete this comment?')) return Promise.resolve()
    return mutate(comment.id, fetch(`/api/comments/${comment.id}`, { method: 'DELETE' }),
      () => publish((comments ?? []).filter((entry) => entry.id !== comment.id)))
  }

  const seek = (comment: ReviewComment) => { if (videoRef?.current && comment.timestamp_start != null) videoRef.current.currentTime = comment.timestamp_start }
  const shown = (comments ?? []).filter((entry) => filter === 'all' || (filter === 'resolved') === !!entry.resolved_at)
  const unresolved = (comments ?? []).filter((entry) => !entry.resolved_at).length

  return <div className="cm-panel">
    <div className="cm-head"><h3 className="card-title" style={{ margin: 0 }}>Comments{comments ? ` · ${unresolved} open` : ''}</h3>
      <div className="seg" role="group" aria-label="Filter comments">
        {(['all', 'unresolved', 'resolved'] as const).map((value) => <button key={value} type="button" className={filter === value ? 'is-active' : ''}
          aria-pressed={filter === value} onClick={() => setFilter(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}</div></div>
    {canWrite ? <div className="cm-compose">
      <label htmlFor={`cm-body-${versionId}`} className="cm-label">New comment at <b>{stamp(playhead)}</b>
        {rangeEnd != null && <> to <b>{stamp(rangeEnd)}</b></>}</label>
      <textarea id={`cm-body-${versionId}`} value={body} onChange={(event) => setBody(event.target.value)} maxLength={2000}
        placeholder="What should change here?" rows={3} />
      <div className="cm-actions">
        <button type="button" className="btn-soft" disabled={busy} onClick={() => setRangeEnd(Math.round(playhead * 10) / 10)}>Set range end</button>
        {rangeEnd != null && <button type="button" className="btn-soft" onClick={() => setRangeEnd(null)}>Clear range</button>}
        <button type="button" className="btn-dark" disabled={busy} onClick={() => void add()}>{busy ? 'Saving…' : 'Add comment'}</button>
      </div>
      <VoiceRecorder recording={recording} onRecorded={setRecording} disabled={busy} />
    </div> : readOnlyReason ? <p className="cm-readonly">{readOnlyReason}</p> : null}
    {error && <p role="alert" className="rv-error">{error}</p>}
    {loadError && <p role="alert" className="rv-error">{loadError} <button type="button" className="cm-link" onClick={() => { setLoadError(''); void load() }}>Retry</button></p>}
    {comments === null && !loadError && <p role="status">Loading comments…</p>}
    {comments && !shown.length && <p className="cm-empty">{comments.length ? 'No comments match this filter.' : 'No comments yet.'}</p>}
    {shown.map((comment) => <div key={comment.id} className={`comment cm-item${comment.resolved_at ? ' is-resolved' : ''}`}>
      <div className="comment-head">
        {comment.timestamp_start != null && videoRef
          ? <button type="button" className="comment-ts cm-ts" onClick={() => seek(comment)} aria-label={`Jump to ${rangeLabel(comment.timestamp_start, comment.timestamp_end)}`}>{rangeLabel(comment.timestamp_start, comment.timestamp_end)}</button>
          : <span className="comment-ts">{rangeLabel(comment.timestamp_start, comment.timestamp_end)}</span>}
        <span className="comment-author">{comment.author_label}{comment.source === 'client' ? ' · Client' : ''}</span>
        {comment.resolved_at && <span className="cm-badge">Resolved</span>}
      </div>
      {editing === comment.id ? <div className="cm-edit">
        <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={3} maxLength={2000} aria-label="Edit comment" />
        <div className="cm-actions"><button type="button" className="btn-dark" disabled={!draft.trim()} onClick={() => void saveEdit(comment)}>Save</button>
          <button type="button" className="btn-soft" onClick={() => setEditing(null)}>Cancel</button></div></div>
        : <div className="comment-text" style={{ whiteSpace: 'pre-wrap' }}>{comment.body}{comment.edited_at ? ' (edited)' : ''}</div>}
      {comment.has_voice && <VoiceNote comment={comment} canRetry={canRetry} onChange={(next) => patch(comment.id, next)} />}
      <div className="cm-actions cm-small">
        <button type="button" className="cm-link" onClick={() => void toggle(comment)}>{comment.resolved_at ? 'Reopen' : 'Mark resolved'}</button>
        {comment.author_id === currentUserId && comment.source === 'internal' && editing !== comment.id && <>
          <button type="button" className="cm-link" onClick={() => { setEditing(comment.id); setDraft(comment.body) }}>Edit</button>
          <button type="button" className="cm-link" onClick={() => void remove(comment)}>Delete</button></>}
      </div>
    </div>)}
  </div>
}
