'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { IconBell } from './icons'

type Item = { id: string; type: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string; batch_count: number }
const CHANNEL = 'notifications'
const day = (value: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(value))
function dayLabel(value: string) {
  const today = day(new Date().toISOString()), yesterday = day(new Date(Date.now() - 864e5).toISOString()), key = day(value)
  if (key === today) return 'Today'
  if (key === yesterday) return 'Yesterday'
  return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))
}
const time = (value: string) => new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(value)).toLowerCase()

/** The TopNav bell: true unread count, recent notifications by day, mark read on click, kept in sync across tabs. */
export function NotificationBell() {
  const router = useRouter()
  const [items, setItems] = useState<Item[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState(false)
  const channel = useRef<BroadcastChannel | null>(null)
  const box = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications', { cache: 'no-store' })
      if (!response.ok) throw new Error()
      const data = await response.json()
      setItems(data.items); setUnread(data.unread); setError(false)
    } catch { setError(true) }
  }, [])

  useEffect(() => {
    queueMicrotask(() => void load())
    const timer = setInterval(() => void load(), 45_000)
    const onVisible = () => { if (document.visibilityState === 'visible') void load() }
    document.addEventListener('visibilitychange', onVisible)
    if ('BroadcastChannel' in window) {
      channel.current = new BroadcastChannel(CHANNEL)
      channel.current.onmessage = () => void load()
    }
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); channel.current?.close() }
  }, [load])

  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => { if (box.current && !box.current.contains(event.target as Node)) setOpen(false) }
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown); document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  async function mark(body: { ids: string[] } | { all: true }) {
    await fetch('/api/notifications/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {})
    channel.current?.postMessage('changed')
  }
  async function openItem(item: Item) {
    if (!item.read_at) {
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, read_at: new Date().toISOString() } : entry))
      setUnread((current) => Math.max(0, current - 1))
      await mark({ ids: [item.id] })
    }
    setOpen(false)
    if (item.link) router.push(item.link)
  }
  async function markAll() {
    setItems((current) => current.map((entry) => ({ ...entry, read_at: entry.read_at ?? new Date().toISOString() })))
    setUnread(0)
    await mark({ all: true })
  }

  const groups: { label: string; rows: Item[] }[] = []
  for (const item of items) {
    const label = dayLabel(item.created_at)
    const last = groups.at(-1)
    if (last?.label === label) last.rows.push(item); else groups.push({ label, rows: [item] })
  }

  return <div className="bell-wrap" ref={box}>
    <button type="button" className="ghost" aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((value) => !value)}>
      <IconBell />
      {unread > 0 && <span className="bell-badge" aria-hidden="true">{unread > 99 ? '99+' : unread}</span>}
    </button>
    {open && <div className="bell-panel" role="dialog" aria-label="Notifications">
      <div className="bell-head"><strong>Notifications</strong>
        <button type="button" className="cm-link" disabled={!unread} onClick={() => void markAll()}>Mark all read</button></div>
      {error && <p className="bell-empty" role="alert">Could not load notifications. <button type="button" className="cm-link" onClick={() => void load()}>Retry</button></p>}
      {!error && !items.length && <p className="bell-empty">You are all caught up. New activity will show up here.</p>}
      <div className="bell-list">
        {groups.map((group) => <div key={group.label}>
          <div className="bell-day">{group.label}</div>
          {group.rows.map((item) => <button key={item.id} type="button" className={`bell-item${item.read_at ? '' : ' is-unread'}`} onClick={() => void openItem(item)}>
            <span className="bell-title">{item.read_at ? '' : <span className="bell-unread-text">New · </span>}{item.title}</span>
            {item.body && <span className="bell-body">{item.body}</span>}
            <span className="bell-time">{time(item.created_at)}</span>
          </button>)}
        </div>)}
      </div>
      <Link href="/account/notifications" className="bell-foot" onClick={() => setOpen(false)}>Notification settings</Link>
    </div>}
  </div>
}
