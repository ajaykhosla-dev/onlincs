'use client'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { SlideOver } from '@/components/shared'
import { enqueueMark, flushQueue, loadSchedule, readQueue, saveSchedule } from '@/lib/offline/store'
import type { ShootView } from '@/lib/phase4/data'

const H = 52, FIRST = 6, LAST = 22
const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const ist = (value: string | Date) => new Date(new Date(value).getTime() + 330 * 60000)
const key = (value: string | Date) => ist(value).toISOString().slice(0, 10)
const today = () => key(new Date())
const add = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10)
const monday = (day: string) => add(day, -((new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7))
const hour = (value: string) => { const d = ist(value); return d.getUTCHours() + d.getUTCMinutes() / 60 }
const time = (value: string) => new Date(value).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true })
const label = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString('en-IN', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' })
const state = (shoot: ShootView) => shoot.status === 'raw_uploaded' ? 'Raw arrived' :
  shoot.ideas.some((idea) => idea.activeUploads.length) ? 'Uploading' :
  new Date(shoot.scheduled_end).getTime() < Date.now() ? 'Raw missing' : 'Upcoming'
const arrival = (idea: ShootView['ideas'][number]) => idea.files.length ? `${idea.files.length} file(s) arrived` :
  idea.activeUploads.length ? `Uploading ${Math.max(...idea.activeUploads.map((s) => Math.round(s.bytes_received / s.file_size_bytes * 100)))}%` :
  idea.raw_uploaded_at ? 'Marked raw uploaded' : 'No raw detected'

export function LiveShootsCalendar({ userId }: { userId: string }) {
  const params = useSearchParams()
  const [shoots, setShoots] = useState<ShootView[]>([])
  const [selected, setSelected] = useState(today)
  const [view, setView] = useState<'week' | 'day'>('week')
  const [openId, setOpenId] = useState<string | null>(params.get('shoot'))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(0)
  const [online, setOnline] = useState(true)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [queued, setQueued] = useState<string[]>([])
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/shoots', { cache: 'no-store' })
      if (!response.ok) throw new Error('Could not load shoots')
      const data = await response.json() as { shoots: ShootView[] }
      saveSchedule(userId, data); setSavedAt(null)
      setShoots(data.shoots.filter((s) => s.status !== 'cancelled'))
      const linked = data.shoots.find((s) => s.id === params.get('shoot'))
      if (linked) setSelected(key(linked.scheduled_start))
      setError('')
    } catch (e) {
      // No connection (or the server is unreachable): fall back to the schedule saved on this phone.
      const saved = loadSchedule<{ shoots: ShootView[] }>(userId)
      if (saved) { setShoots(saved.data.shoots.filter((s) => s.status !== 'cancelled')); setSavedAt(saved.savedAt); setError('') }
      else setError(e instanceof Error ? e.message : 'Could not load shoots')
    }
    finally { setLoading(false) }
  }, [params, userId])
  const sync = useCallback(async () => {
    const { sent, remaining } = await flushQueue(userId, (entry) => fetch(`/api/shoots/${entry.shootId}/raw`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content_item_id: entry.itemId }) }))
    setQueued(remaining.map((entry) => entry.itemId))
    if (sent) await load()
  }, [userId, load])
  useEffect(() => {
    const update = () => { setOnline(navigator.onLine); if (navigator.onLine) void sync() }
    queueMicrotask(() => { setOnline(navigator.onLine); setQueued(readQueue(userId).map((entry) => entry.itemId)); if (navigator.onLine) void sync() })
    window.addEventListener('online', update); window.addEventListener('offline', update)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [sync, userId])
  useEffect(() => { queueMicrotask(() => void load()); const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer) }, [load])
  const open = shoots.find((s) => s.id === openId)
  const shown = view === 'day' ? [selected] : Array.from({ length: 7 }, (_, i) => add(monday(selected), i))
  const onDay = (day: string) => shoots.filter((s) => key(s.scheduled_start) === day)
  const upcoming = shoots.filter((s) => new Date(s.scheduled_start).getTime() >= now).sort((a, b) => a.scheduled_start.localeCompare(b.scheduled_start))[0]
  const pending = shoots.filter((s) => new Date(s.scheduled_end).getTime() < now && s.status !== 'raw_uploaded' && s.ideas.some((i) => !i.raw_uploaded_at && !i.files.length))
  const month = selected.slice(0, 7), start = `${month}-01`
  const monthDays = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate()
  const leading = (new Date(`${start}T00:00:00Z`).getUTCDay() + 6) % 7
  async function markRaw(itemId: string) {
    if (!open || !window.confirm('Mark this idea as raw uploaded? Use this when the file is already in Drive.')) return
    let response: Response
    try {
      if (!navigator.onLine) throw new Error('offline')
      response = await fetch(`/api/shoots/${open.id}/raw`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content_item_id: itemId }) })
    } catch {
      // Offline: keep the mark on this phone and send it when the connection returns. It stays visible as queued.
      setQueued(enqueueMark(userId, open.id, itemId).map((entry) => entry.itemId)); setError('')
      return
    }
    if (!response.ok) { setError((await response.json().catch(() => ({}))).message ?? 'Could not mark raw uploaded'); return }
    await load()
  }
  return <section id="screen-shoots">
    <h1 className="sr-only">My shoots</h1>
    <div className="cal-layout">
      <aside className="cal-sidebar"><button className="today-pill" onClick={() => setSelected(today())}>Today</button>
        <div className="mini-cal-head"><button className="mini-chevron" aria-label="Previous month" onClick={() => setSelected(add(start, -1))}>‹</button><span className="mini-month-label">{label(start).replace(/^1 /, '')}</span><button className="mini-chevron" aria-label="Next month" onClick={() => setSelected(add(`${month}-${monthDays}`, 1))}>›</button></div>
        <div className="mini-cal-grid">{weekdays.map((d) => <div key={d} className="mini-dow">{d[0]}</div>)}{Array.from({ length: leading }, (_, i) => <span key={`blank-${i}`} />)}{Array.from({ length: monthDays }, (_, i) => { const day = `${month}-${String(i + 1).padStart(2, '0')}`; return <button key={day} className={`mini-day${day === today() ? ' is-today' : day === selected ? ' is-selected' : ''}`} onClick={() => setSelected(day)}>{i + 1}{onDay(day).length > 0 && <span className="mini-dot" />}</button> })}</div>
        {upcoming && <div className="upnext-card"><div className="upnext-label">Up next</div><div className="upnext-client">{upcoming.client.name}</div><div className="upnext-meta">{label(key(upcoming.scheduled_start))} · {time(upcoming.scheduled_start)} · {upcoming.ideas.length} ideas</div></div>}
        <Link className="pending-link" href="/cameraman/pending">Pending uploads <span className="badge">{pending.length}</span></Link>
      </aside>
      <div className="grid-area"><div className="day-strip-wrap"><div className="day-strip-head"><button className="today-pill" onClick={() => setSelected(today())}>Today</button><strong>{label(start).replace(/^1 /, '')}</strong></div><div className="day-strip">{Array.from({ length: 7 }, (_, i) => { const d = add(monday(selected), i); return <button key={d} className={`strip-day${d === today() ? ' is-today' : d === selected ? ' is-selected' : ''}`} onClick={() => setSelected(d)}><span className="strip-dow">{weekdays[i]}</span><span className="strip-num">{Number(d.slice(-2))}</span>{onDay(d).length > 0 && <span className="strip-dot" />}</button> })}</div></div>
        <div className="grid-header"><button className="gh-chevron" aria-label="Previous" onClick={() => setSelected(add(selected, view === 'day' ? -1 : -7))}>‹</button><button className="gh-chevron" aria-label="Next" onClick={() => setSelected(add(selected, view === 'day' ? 1 : 7))}>›</button><button className="gh-today" onClick={() => setSelected(today())}>Today</button><div className="grid-title">{view === 'day' ? label(selected) : `${label(shown[0])} – ${label(shown[6])}`}</div><div className="seg view-toggle" role="group" aria-label="View"><button className={view === 'week' ? 'is-active' : ''} onClick={() => setView('week')}>Week</button><button className={view === 'day' ? 'is-active' : ''} onClick={() => setView('day')}>Day</button></div></div>
        {savedAt && <p role="status" className="cm-meta">Showing your saved schedule from {new Date(savedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}. It updates when you are back online.</p>}
        {queued.length > 0 && <p role="status" className="cm-meta">{queued.length} change{queued.length === 1 ? '' : 's'} waiting to sync.</p>}
        {error && <p role="alert">{error} <button onClick={() => void load()}>Retry</button></p>}
        {loading ? <p role="status">Loading shoots…</p> : <><div className="day-columns-head"><div className="dch-gutter" />{shown.map((d) => <div className={`dch-day${d === today() ? ' is-today' : ''}`} key={d}><div className="dch-dow">{weekdays[(new Date(`${d}T00:00:00Z`).getUTCDay() + 6) % 7]}</div><div className="dch-num">{Number(d.slice(-2))}</div></div>)}</div><div className="grid-scroll"><div className="grid-body"><div className="hour-gutter">{Array.from({ length: LAST - FIRST }, (_, i) => <div className="hour-label" key={i}>{(i + FIRST) % 12 || 12} {(i + FIRST) < 12 ? 'AM' : 'PM'}</div>)}</div><div className="day-columns">{shown.map((d) => <div className="day-col" key={d} style={{ height: (LAST - FIRST) * H }}>{Array.from({ length: LAST - FIRST }, (_, i) => <div className="hour-row" key={i} />)}{onDay(d).map((s) => <button key={s.id} className={`evt${state(s) === 'Raw arrived' ? ' is-completed' : state(s) === 'Raw missing' ? ' is-raw-missing' : ''}`} style={{ top: Math.max(0, (hour(s.scheduled_start) - FIRST) * H), height: Math.max(32, (hour(s.scheduled_end) - hour(s.scheduled_start)) * H) }} onClick={() => setOpenId(s.id)}><div className="evt-time">{time(s.scheduled_start)}–{time(s.scheduled_end)}</div><div className="evt-client">{s.client.name}</div><div className="evt-meta">{s.ideas.length} ideas · {state(s)}</div></button>)}{d === today() && <div className="now-line" style={{ top: Math.max(0, (hour(new Date(now).toISOString()) - FIRST) * H) }} />}</div>)}</div></div></div>{view === 'day' && onDay(selected).length === 0 && <div className="grid-empty is-visible"><p>No shoots today</p>{upcoming && <button className="btn-dark" onClick={() => setSelected(key(upcoming.scheduled_start))}>Jump to next shoot</button>}</div>}</>}
      </div>
    </div>
    <SlideOver open={!!open} onClose={() => setOpenId(null)} title={open?.client.name} ariaLabel="Shoot detail" closeLabel="Close shoot detail" flex>{open && <div style={{ padding: 20 }}><div className="detail-hero"><h2>{open.title}</h2><div className="detail-meta-row">{label(key(open.scheduled_start))} · {time(open.scheduled_start)}–{time(open.scheduled_end)}</div><div className="detail-meta-row">{open.location}</div><span className={`detail-state st--${state(open) === 'Raw arrived' ? 'completed' : state(open) === 'Raw missing' ? 'raw-missing' : 'upcoming'}`}>{state(open)}</span></div>{open.ideas.map((idea) => <div className="idea-block" key={idea.content_item_id}><div className="idea-name">{idea.item.title}</div><div className="idea-field"><b>Concept</b><p>{idea.item.concept || 'No concept added'}</p></div><div className="idea-field"><b>Script / talking points</b><p>{idea.item.script || 'No script added'}</p></div>{(Array.isArray(idea.item.reference_links) ? idea.item.reference_links : []).map((ref, i) => typeof ref === 'string' && /^https?:\/\//.test(ref) ? <a className="ref-btn" href={ref} target="_blank" rel="noopener noreferrer" key={i}>Reference {i + 1}</a> : null)}{online ? <Link className="upload-btn" href={`/cameraman/upload?shoot=${open.id}&item=${idea.content_item_id}`}>Upload raw footage</Link>
          : <><button type="button" className="upload-btn" disabled aria-describedby="needs-connection">Upload raw footage</button><p id="needs-connection" role="status" className="cm-meta">Needs a connection. Uploading and Drive links work again when you are back online.</p></>}<div className="mark-row"><span className="mark-label">{queued.includes(idea.content_item_id) ? 'Queued — will sync when you reconnect' : arrival(idea)}</span><button className={`switch${idea.raw_uploaded_at || queued.includes(idea.content_item_id) ? ' is-on' : ''}`} aria-label={`Mark raw uploaded for ${idea.item.title}`} aria-pressed={!!idea.raw_uploaded_at || queued.includes(idea.content_item_id)} disabled={!!idea.raw_uploaded_at || queued.includes(idea.content_item_id)} onClick={() => void markRaw(idea.content_item_id)} /></div></div>)}</div>}</SlideOver>
  </section>
}
