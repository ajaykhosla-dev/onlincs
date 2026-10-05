'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { MediaPlayer } from '@/components/editor/MediaPlayer'
import { CommentsPanel } from './CommentsPanel'
import type { MediaVersion } from '@/lib/phase5/data'
import type { ReviewComment } from '@/lib/phase6/review'

type LinkInfo = { id: string; created_at: string; expires_at: string; viewed_at: string | null; response: string | null
  locked: boolean; failed_attempts: number; expired: boolean; active: boolean } | null
type Issued = { url: string; pin: string; expiresAt: string }
const dateTime = (value: string) => new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })
async function message(response: Response, fallback: string) {
  const payload = await response.json().catch(() => ({})); return typeof payload.message === 'string' ? payload.message : fallback
}

/** Review of one content item: player, timestamped comments, internal decision, client link and reopen. */
export function ReviewPanel({ itemId, itemStatus, versions, currentUserId }: {
  itemId: string; itemStatus: string; versions: MediaVersion[]; currentUserId: string
}) {
  const router = useRouter()
  const latest = versions.at(-1)
  const [chosen, setChosen] = useState<string | null>(null)
  const video = useRef<HTMLVideoElement>(null)
  const [comments, setComments] = useState<ReviewComment[]>([])
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [link, setLink] = useState<LinkInfo>(null)
  const [issued, setIssued] = useState<Issued | null>(null)
  const [reopenNote, setReopenNote] = useState('')

  const viewing = versions.find((entry) => entry.id === chosen) ?? latest
  const isLatest = viewing?.id === latest?.id
  const linkRelevant = ['internally_approved', 'with_client', 'client_approved', 'client_changes'].includes(itemStatus)

  const loadLink = useCallback(async () => {
    const response = await fetch(`/api/review/${itemId}/link`, { cache: 'no-store' })
    if (response.ok) setLink((await response.json()).link)
  }, [itemId])
  useEffect(() => { if (linkRelevant) queueMicrotask(() => void loadLink()) }, [linkRelevant, loadLink, itemStatus])
  const shownLink = linkRelevant ? link : null

  async function call(label: string, request: () => Promise<Response>, after?: (payload: unknown) => void) {
    setBusy(label); setError('')
    try {
      const response = await request()
      if (!response.ok) throw new Error(await message(response, 'That did not work. Try again.'))
      after?.(await response.json().catch(() => ({})))
      router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'That did not work. Try again.') }
    finally { setBusy('') }
  }
  const post = (url: string, body?: unknown) => () => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) })

  function decide(decision: 'approve' | 'changes') {
    if (decision === 'changes' && !comments.some((entry) => !entry.resolved_at)) {
      setError('Add at least one unresolved comment before sending changes. The editor needs to know what to fix.'); return
    }
    void call(decision, post(`/api/review/${itemId}/decision`, { decision }))
  }
  const generate = () => call('link', post(`/api/review/${itemId}/link`), (payload) => { setIssued(payload as Issued); void loadLink() })
  const revoke = () => { if (window.confirm('Revoke this link? The client will no longer be able to open it.')) void call('revoke', () => fetch(`/api/review/${itemId}/link`, { method: 'DELETE' }), () => { setIssued(null); void loadLink() }) }
  const copy = (text: string) => navigator.clipboard?.writeText(text).catch(() => {})

  if (!latest || !viewing) return <p>No cut has been submitted yet.</p>
  const inReview = itemStatus === 'cut_submitted' && isLatest

  return <div className="review-layout" style={{ marginTop: 14 }}>
    <section>
      {versions.length > 1 && <div className="seg" role="group" aria-label="Cut version" style={{ marginBottom: 10 }}>
        {[...versions].reverse().map((entry) => <button key={entry.id} type="button" aria-pressed={entry.id === viewing.id}
          className={entry.id === viewing.id ? 'is-active' : ''} onClick={() => setChosen(entry.id)}>v{entry.version}{entry.id === latest.id ? ' · latest' : ''}</button>)}</div>}
      <MediaPlayer key={viewing.id} versionId={viewing.id} title={`version ${viewing.version}`} videoRef={video} autoLoad />
      <p className="cm-meta">Version {viewing.version} · {viewing.status.replaceAll('_', ' ')} · {(viewing.file_size_bytes / 1048576).toFixed(1)} MB{!isLatest ? ' · read only' : ''}</p>

      {inReview && <div className="cm-decision">
        <button type="button" className="btn-pink" disabled={!!busy} onClick={() => decide('changes')}>{busy === 'changes' ? 'Sending…' : 'Send changes'}</button>
        <button type="button" className="btn-dark" disabled={!!busy} onClick={() => decide('approve')}>{busy === 'approve' ? 'Approving…' : 'Approve'}</button>
      </div>}
      {itemStatus === 'changes_requested' && isLatest && <p className="cm-meta">Changes were sent. The item is in the editor&apos;s Re-do queue.</p>}
      {itemStatus === 'client_changes' && isLatest && <p className="cm-meta">The client asked for changes. The item is in the editor&apos;s Re-do queue.</p>}

      {isLatest && itemStatus === 'internally_approved' && <div className="cm-block"><h3>Send to client</h3>
        <p>This cut is approved internally. Generate a private link and PIN to share with the client.</p>
        <button type="button" className="btn-dark" disabled={!!busy} onClick={() => void generate()}>{busy === 'link' ? 'Generating…' : 'Generate client link'}</button></div>}

      {isLatest && itemStatus === 'with_client' && <div className="cm-block"><h3>With the client</h3>
        {shownLink?.active ? <p>A link is active. Sent {dateTime(shownLink.created_at)}, expires {dateTime(shownLink.expires_at)}.{' '}
          {shownLink.viewed_at ? `Opened ${dateTime(shownLink.viewed_at)}.` : 'Not opened yet.'}{shownLink.locked ? ' It is locked after too many wrong PINs.' : ''}{shownLink.expired ? ' It has expired.' : ''}</p>
          : <p>No link is active. Generate a new one to send it.</p>}
        <p className="cm-meta">The link and PIN are shown only once, when generated. Regenerate to get new ones; the previous link stops working.</p>
        <div className="cm-actions">
          <button type="button" className="btn-dark" disabled={!!busy} onClick={() => void generate()}>{busy === 'link' ? 'Generating…' : shownLink?.active ? 'Regenerate link' : 'Generate link'}</button>
          {shownLink?.active && <button type="button" className="btn-soft" disabled={!!busy} onClick={revoke}>Revoke link</button>}
        </div></div>}

      {issued && <div className="cm-block cm-issued" role="status"><h3>Copy these now</h3>
        <p>They will not be shown again. Share the link and the PIN with the client separately if you can.</p>
        <label className="cm-label" htmlFor="issued-url">Client link</label><input id="issued-url" readOnly value={issued.url} onFocus={(event) => event.currentTarget.select()} />
        <div className="cm-actions"><button type="button" className="btn-soft" onClick={() => copy(issued.url)}>Copy link</button></div>
        <label className="cm-label" htmlFor="issued-pin">PIN</label><input id="issued-pin" readOnly value={issued.pin} style={{ width: 110, letterSpacing: '.3em', fontWeight: 800 }} />
        <div className="cm-actions"><button type="button" className="btn-soft" onClick={() => copy(issued.pin)}>Copy PIN</button>
          <button type="button" className="btn-dark" onClick={() => setIssued(null)}>I have copied them</button></div>
        <p className="cm-meta">Expires {dateTime(issued.expiresAt)}.</p></div>}

      {isLatest && itemStatus === 'client_approved' && <div className="cm-block"><h3>Client approved</h3>
        <p>If the client asks for a change later, reopen the item to send it back to the editor.</p>
        <label className="cm-label" htmlFor="reopen-note">What needs to change?</label>
        <textarea id="reopen-note" rows={3} maxLength={4000} value={reopenNote} onChange={(event) => setReopenNote(event.target.value)} />
        <div className="cm-actions"><button type="button" className="btn-pink" disabled={!!busy || !reopenNote.trim()}
          onClick={() => void call('reopen', post(`/api/review/${itemId}/reopen`, { note: reopenNote }), () => setReopenNote(''))}>{busy === 'reopen' ? 'Reopening…' : 'Reopen with changes'}</button></div></div>}
      {error && <p role="alert" className="rv-error">{error}</p>}
    </section>
    <aside className="card" style={{ padding: '18px 20px' }}>
      <CommentsPanel key={viewing.id} versionId={viewing.id} videoRef={video} canWrite={isLatest} canRetry currentUserId={currentUserId}
        onChanged={setComments} readOnlyReason={isLatest ? undefined : 'Older versions are read only.'} />
    </aside>
  </div>
}
