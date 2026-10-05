'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { MetricCard, Modal, Tag } from '@/components/shared'
import { IconCheck, IconDownload, IconHourglass, IconWarning } from '@/components/shared/icons'
import { MonthGrid, type MonthDay } from './MonthGrid'
import { daysLate, istClock, istDate, istDateTime, istTime, istToIso, UNDO_HOURS } from '@/lib/phase7/format'
import type { PostRow } from '@/lib/phase7/data'

type Schedulable = { id: string; title: string; type: string; client_id: string; client_name: string }
type Data = { posts: PostRow[]; overdue: PostRow[]; upcoming: PostRow[]; schedulable: Schedulable[] }
type Nearby = { content_item_id: string; title: string; scheduled_at: string }
type Form = { itemId: string; date: string; time: string; caption: string; music: string }

const CAPTION_LIMIT = 2200
const todayIst = () => istDate(new Date())
const shiftMonth = (month: string, by: number) => {
  const [year, index] = month.split('-').map(Number)
  const date = new Date(Date.UTC(year, index - 1 + by, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}
async function failure(response: Response, fallback: string) {
  const payload = await response.json().catch(() => ({})); return typeof payload.message === 'string' ? payload.message : fallback
}
/** The state is spelled out in words so it never relies on colour alone. */
function postState(post: PostRow) {
  if (post.posted_at) return { tag: 'mint' as const, text: `Posted ${istDateTime(post.posted_at)}` }
  const late = Date.parse(post.scheduled_at) < Date.now()
  if (late) { const days = daysLate(post.scheduled_at); return { tag: 'pink' as const, text: `Overdue · ${days === 0 ? 'due earlier today' : `${days} ${days === 1 ? 'day' : 'days'} late`}` } }
  return { tag: 'sky' as const, text: `Upcoming · ${istDateTime(post.scheduled_at)}` }
}
const canUndo = (post: PostRow) => !!post.posted_at && Date.now() - Date.parse(post.posted_at) <= UNDO_HOURS * 3600e3

export function LivePosting({ banner, intro }: { banner?: ReactNode; intro: string }) {
  const [month, setMonth] = useState(() => todayIst().slice(0, 7))
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')
  const [day, setDay] = useState(() => todayIst())
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')
  const [modal, setModal] = useState<{ mode: 'schedule' } | { mode: 'edit'; post: PostRow } | null>(null)
  const [form, setForm] = useState<Form>({ itemId: '', date: todayIst(), time: '10:00', caption: '', music: '' })
  const [nearby, setNearby] = useState<Nearby[]>([])
  const [warnDismissed, setWarnDismissed] = useState(false)
  const [formError, setFormError] = useState('')
  const [listFilter, setListFilter] = useState<'overdue' | 'today' | 'week' | null>(null)

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/posting?month=${month}`, { cache: 'no-store' })
      if (!response.ok) throw new Error(await failure(response, 'Could not load the posting schedule'))
      setData(await response.json()); setError('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load the posting schedule') }
  }, [month])
  useEffect(() => { queueMicrotask(() => void load()) }, [load])
  useEffect(() => { const url = new URL(window.location.href); url.searchParams.set('month', month); window.history.replaceState(null, '', url) }, [month])

  const [year, index] = month.split('-').map(Number)
  const byDay = new Map<number, PostRow[]>()
  for (const post of data?.posts ?? []) {
    const key = Number(istDate(post.scheduled_at).slice(8, 10))
    byDay.set(key, [...(byDay.get(key) ?? []), post])
  }
  const selectedDay = day.startsWith(month) ? Number(day.slice(8, 10)) : 1
  const dayPosts = byDay.get(selectedDay) ?? []
  const days: Record<number, MonthDay> = {}
  for (let d = 1; d <= new Date(year, index, 0).getDate(); d++) {
    const posts = byDay.get(d) ?? []
    days[d] = { onClick: () => setDay(`${month}-${String(d).padStart(2, '0')}`), ariaLabel: `${d} ${monthLabel(month)}: ${posts.length} post${posts.length === 1 ? '' : 's'}`,
      children: posts.length ? <div style={{ display: 'grid', gap: 2 }}>{posts.map((post) => {
        const state = postState(post)
        const prefix = post.posted_at ? 'Posted · ' : state.tag === 'pink' ? 'Overdue · ' : ''
        return <span key={post.id} className={`cal-chip ${post.posted_at ? 'c--grv' : state.tag === 'pink' ? 'c--sdh' : 'c--bsl'}`}
          title={`${post.title} — ${post.client_name}`}>{prefix}{istTime(post.scheduled_at)} {post.client_name} · {post.type}</span>
      })}</div> : undefined }
  }

  const overdue = data?.overdue ?? []
  const today = todayIst()
  const dueToday = [...overdue, ...(data?.upcoming ?? [])].filter((post) => istDate(post.scheduled_at) === today)
  const upcomingWeek = (data?.upcoming ?? []).filter((post) => istDate(post.scheduled_at) !== today)

  async function checkNearby(next: Form, client?: string) {
    const clientId = client ?? data?.schedulable.find((item) => item.id === next.itemId)?.client_id
    if (!clientId || !next.date || !next.time) { setNearby([]); return }
    const response = await fetch(`/api/posting/nearby?clientId=${encodeURIComponent(clientId)}&at=${encodeURIComponent(istToIso(next.date, next.time))}&exclude=${encodeURIComponent(next.itemId)}`, { cache: 'no-store' })
    setWarnDismissed(false)
    setNearby(response.ok ? (await response.json()).nearby : [])
  }
  function update(patch: Partial<Form>, client?: string) {
    const next = { ...form, ...patch }
    setForm(next)
    if ('itemId' in patch || 'date' in patch || 'time' in patch) void checkNearby(next, client)
  }
  function openSchedule() {
    setForm({ itemId: data?.schedulable[0]?.id ?? '', date: day.startsWith(month) ? day : todayIst(), time: '10:00', caption: '', music: '' })
    setNearby([]); setWarnDismissed(false); setFormError(''); setModal({ mode: 'schedule' })
  }
  function openEdit(post: PostRow) {
    setForm({ itemId: post.content_item_id, date: istDate(post.scheduled_at), time: istClock(post.scheduled_at), caption: post.caption, music: post.bg_music_ref ?? '' })
    setNearby([]); setWarnDismissed(false); setFormError(''); setModal({ mode: 'edit', post })
    void checkNearby({ itemId: post.content_item_id, date: istDate(post.scheduled_at), time: istClock(post.scheduled_at), caption: '', music: '' }, post.client_id)
  }
  async function save() {
    if (!modal) return
    if (modal.mode === 'schedule' && !form.itemId) { setFormError('Choose a client-approved item to schedule.'); return }
    if (!form.date || !form.time) { setFormError('Choose a date and time.'); return }
    setBusy('save'); setFormError('')
    try {
      const body = { scheduledAt: istToIso(form.date, form.time), caption: form.caption, music: form.music }
      const response = modal.mode === 'schedule'
        ? await fetch('/api/posting', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemId: form.itemId, ...body }) })
        : await fetch(`/api/posting/${modal.post.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!response.ok) throw new Error(await failure(response, 'Could not save the post'))
      const savedMonth = form.date.slice(0, 7)
      setModal(null); setNotice(modal.mode === 'schedule' ? 'Post scheduled.' : 'Post updated.')
      setDay(form.date)
      if (savedMonth !== month) setMonth(savedMonth); else await load()
    } catch (cause) { setFormError(cause instanceof Error ? cause.message : 'Could not save the post') }
    finally { setBusy('') }
  }
  async function act(post: PostRow, kind: 'posted' | 'undo' | 'download') {
    setBusy(`${kind}-${post.id}`); setNotice(''); setError('')
    try {
      if (kind === 'download') {
        const response = await fetch(`/api/posting/${post.id}/download`, { cache: 'no-store' })
        if (!response.ok) throw new Error(await failure(response, 'Could not prepare the download'))
        const { url } = await response.json()
        window.location.assign(url)
        setNotice('Download started.')
      } else {
        const response = await fetch(`/api/posting/${post.id}/posted`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ posted: kind === 'posted' }) })
        if (!response.ok) throw new Error(await failure(response, 'That did not work'))
        setNotice(kind === 'posted' ? 'Marked as posted.' : 'Posting undone. The post is scheduled again.')
        await load()
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'That did not work') }
    finally { setBusy('') }
  }

  const actions = (post: PostRow) => <div className="cm-actions" style={{ marginTop: 8 }}>
    <button type="button" className="btn-soft" disabled={!!busy} onClick={() => void act(post, 'download')}><IconDownload />{busy === `download-${post.id}` ? 'Preparing…' : 'Download final cut'}</button>
    {!post.posted_at && post.item_status === 'scheduled' && <>
      <button type="button" className="btn-dark" disabled={!!busy} onClick={() => void act(post, 'posted')}>{busy === `posted-${post.id}` ? 'Saving…' : 'Mark posted'}</button>
      <button type="button" className="btn-soft" disabled={!!busy} onClick={() => openEdit(post)}>Edit time or caption</button></>}
    {post.posted_at && (canUndo(post)
      ? <button type="button" className="btn-soft" disabled={!!busy} onClick={() => void act(post, 'undo')}>{busy === `undo-${post.id}` ? 'Undoing…' : 'Undo posted'}</button>
      : <span className="cm-meta">Posted over {UNDO_HOURS} hours ago, so it can no longer be undone.</span>)}
  </div>

  return <>
    {banner}
    <section className="hero-row">
      <div className="hello"><h1>Posting schedule<span className="light">{monthLabel(month)}</span></h1><p>{intro}</p></div>
      {([['overdue', 'Overdue', overdue.length], ['today', 'Due today', dueToday.length], ['week', 'Next 7 days', upcomingWeek.length]] as const).map(([key, name, count]) =>
        <button key={key} type="button" className="metric-btn" aria-pressed={listFilter === key} aria-label={`${name}: ${count}. ${listFilter === key ? 'Show everything' : 'Show only these'}`}
          onClick={() => setListFilter(listFilter === key ? null : key)}>
          {key === 'overdue' ? <MetricCard tone="pink" icon={<IconWarning />} badge={overdue.length ? `${daysLate(overdue[0].scheduled_at)}d oldest` : undefined} value={count} label={name} note="Past time, not yet posted" />
            : key === 'today' ? <MetricCard tone="amber" icon={<IconHourglass />} value={count} label={name} note="Still to post" />
            : <MetricCard tone="mint" icon={<IconCheck />} value={count} label={name} note="Scheduled after today" />}
        </button>)}
    </section>
    {notice && <p role="status" className="cm-meta" style={{ marginBottom: 12 }}>{notice}</p>}
    {error && <p role="alert" className="rv-error" style={{ marginBottom: 12 }}>{error}</p>}

    <div className="grid">
      <section className="card" style={{ padding: '22px 26px' }}>
        <div className="card-head" style={{ padding: '0 0 16px' }}>
          <div className="card-tools" style={{ gap: 10 }}>
            <button type="button" className="tool" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}>‹</button>
            <div className="card-title">{monthLabel(month)}</div>
            <button type="button" className="tool" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))}>›</button>
            <button type="button" className="btn-soft" onClick={() => { setMonth(todayIst().slice(0, 7)); setDay(todayIst()) }}>Today</button>
          </div>
          <button type="button" className="btn-dark" onClick={openSchedule} disabled={!data?.schedulable.length}
            title={data && !data.schedulable.length ? 'No client-approved items are waiting to be scheduled' : undefined}>Schedule a post</button>
        </div>
        {!data && !error ? <p role="status">Loading the schedule…</p> :
          <MonthGrid year={year} month={index - 1} today={today.startsWith(month) ? Number(today.slice(8, 10)) : undefined} days={days} />}
        {data && !data.schedulable.length && <p className="cm-meta" style={{ marginTop: 12 }}>Nothing is waiting to be scheduled. Items appear here once the client approves them.</p>}
      </section>

      <aside className="side">
        <section className="card queue">
          <div className="card-head" style={{ padding: '0 0 4px' }}><div className="card-title">{selectedDay} {monthLabel(month)}</div></div>
          {!dayPosts.length ? <p className="cm-meta" style={{ padding: '12px 0' }}>Nothing is scheduled to post on {selectedDay} {monthLabel(month)}.</p>
            : dayPosts.map((post) => {
              const state = postState(post)
              return <div key={post.id} className="queue-item" style={{ display: 'block' }}>
                <div className="queue-title">{post.title}</div>
                <div className="queue-meta">{post.client_name} · {post.type} · {istTime(post.scheduled_at)} IST</div>
                <div style={{ margin: '8px 0' }}><Tag variant={state.tag}>{state.text}</Tag></div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.6, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                  <b>Caption:</b> {post.caption || 'No caption yet'}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 }}><b>Music:</b> {post.bg_music_ref || 'None set'}</div>
                {actions(post)}
              </div>
            })}
        </section>
      </aside>
    </div>

    <section className="card" style={{ padding: '22px 26px', marginTop: 18 }}>
      {listFilter && <p className="cm-meta" style={{ marginBottom: 8 }}>Showing only {listFilter === 'overdue' ? 'overdue posts' : listFilter === 'today' ? 'posts due today' : 'posts in the next 7 days'}. <button type="button" className="cm-link" onClick={() => setListFilter(null)}>Show everything</button></p>}
      {(!listFilter || listFilter === 'overdue') && <>
      <div className="card-head" style={{ padding: '0 0 12px' }}><div className="card-title">Overdue · {overdue.length}</div></div>
      {!overdue.length ? <p className="cm-meta">Nothing is overdue. Every scheduled post has gone out or is still to come.</p>
        : overdue.map((post) => <div key={post.id} className="queue-item" style={{ display: 'block' }}>
          <div className="queue-title">{post.title} <Tag variant="pink">{postState(post).text}</Tag></div>
          <div className="queue-meta">{post.client_name} · {post.type} · was due {istDateTime(post.scheduled_at)} IST</div>
          {actions(post)}</div>)}</>}
      {(!listFilter || listFilter === 'today') && <>
      <div className="card-head" style={{ padding: '18px 0 8px' }}><div className="card-title">Today · {dueToday.length}</div></div>
      {!dueToday.length ? <p className="cm-meta">Nothing is due today.</p> : dueToday.map((post) =>
        <p key={post.id} className="cm-meta"><b>{istTime(post.scheduled_at)}</b> · {post.title} · {post.client_name} · {postState(post).text}</p>)}
      </>}
      {(!listFilter || listFilter === 'week') && <>
      <div className="card-head" style={{ padding: '18px 0 8px' }}><div className="card-title">This week · {upcomingWeek.length}</div></div>
      {!upcomingWeek.length ? <p className="cm-meta">Nothing else is scheduled in the next 7 days.</p> : upcomingWeek.map((post) =>
        <p key={post.id} className="cm-meta"><b>{istDateTime(post.scheduled_at)}</b> · {post.title} · {post.client_name}</p>)}
      </>}
    </section>

    <Modal open={!!modal} onClose={() => setModal(null)} titleId="post-form-title" closeLabel="Close post form"
      title={modal?.mode === 'edit' ? `Edit ${modal.post.title}` : 'Schedule a post'}
      footer={<><button type="button" className="btn-soft" onClick={() => setModal(null)}>Cancel</button>
        <button type="button" className="btn-dark" disabled={busy === 'save'} onClick={() => void save()}>{busy === 'save' ? 'Saving…' : modal?.mode === 'edit' ? 'Save changes' : 'Schedule'}</button></>}>
      <div>
        {modal?.mode === 'schedule' && <div className="field"><label htmlFor="post-item">Client-approved item</label>
          <select id="post-item" value={form.itemId} onChange={(event) => update({ itemId: event.target.value })}>
            {data?.schedulable.map((item) => <option key={item.id} value={item.id}>{item.client_name} · {item.title} ({item.type})</option>)}</select></div>}
        <div className="field"><label htmlFor="post-date">Date (IST)</label><input id="post-date" type="date" value={form.date} onChange={(event) => update({ date: event.target.value })} /></div>
        <div className="field"><label htmlFor="post-time">Time (IST)</label><input id="post-time" type="time" value={form.time} onChange={(event) => update({ time: event.target.value })} /></div>
        {nearby.length > 0 && !warnDismissed && <div className="cm-block cm-issued" role="alert" style={{ marginBottom: 12 }}>
          <p><b>Heads up:</b> this client already has {nearby.length === 1 ? 'a post' : `${nearby.length} posts`} within an hour of this time: {nearby.map((post) => `${post.title} at ${istTime(post.scheduled_at)}`).join(', ')}. You can still save.</p>
          <div className="cm-actions"><button type="button" className="btn-soft" onClick={() => setWarnDismissed(true)}>Dismiss</button></div></div>}
        <div className="field"><label htmlFor="post-caption">Caption</label>
          <textarea id="post-caption" rows={9} value={form.caption} onChange={(event) => update({ caption: event.target.value })} style={{ whiteSpace: 'pre-wrap' }} aria-describedby="post-caption-count" />
          <small id="post-caption-count" aria-live="polite">{form.caption.length.toLocaleString('en-IN')} characters{form.caption.length > CAPTION_LIMIT ? ` · over Instagram's ${CAPTION_LIMIT.toLocaleString('en-IN')} limit` : ` · Instagram allows ${CAPTION_LIMIT.toLocaleString('en-IN')}`}</small></div>
        <div className="field"><label htmlFor="post-music">Background music reference</label><input id="post-music" value={form.music} maxLength={300} onChange={(event) => update({ music: event.target.value })} /></div>
        {formError && <p role="alert" className="rv-error">{formError}</p>}
      </div>
    </Modal>
  </>
}

function monthLabel(month: string) {
  const [year, index] = month.split('-').map(Number)
  return new Date(Date.UTC(year, index - 1, 1)).toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}
