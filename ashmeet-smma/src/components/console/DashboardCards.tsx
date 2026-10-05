'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { MetricCard } from '@/components/shared'
import { IconCheck, IconClients, IconHourglass, IconWarning } from '@/components/shared/icons'
import type { CardRow, Cards } from '@/lib/analytics/cards'

type Key = keyof Cards
const COPY: Record<Key, { label: string; note: string; empty: string }> = {
  activeClients: { label: 'Active clients', note: 'Accounts currently running', empty: 'No active clients.' },
  waiting: { label: 'Waiting on approval', note: 'Cuts in review, approved or with the client', empty: 'Nothing is waiting on an approval.' },
  pastDeadline: { label: 'Past deadline', note: 'Edits later than their deadline', empty: 'No edit is past its deadline.' },
  overduePosts: { label: 'Overdue posts', note: 'Approved cuts past their post time', empty: 'Nothing is overdue to post.' },
}

/** Metric cards whose numbers are the lengths of the lists they open: click a card to see exactly the rows it counts. */
export function DashboardCards() {
  const [cards, setCards] = useState<Cards | null>(null)
  const [error, setError] = useState(false)
  const [selected, setSelected] = useState<Key | null>(null)

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/dashboard/cards', { cache: 'no-store' })
      if (!response.ok) throw new Error()
      setCards(await response.json()); setError(false)
    } catch { setError(true) }
  }, [])
  // Refreshed on a timer and whenever the tab regains focus, so a count follows the work that changes it.
  useEffect(() => {
    queueMicrotask(() => void load())
    const timer = setInterval(() => void load(), 30_000)
    const onFocus = () => { if (document.visibilityState === 'visible') void load() }
    document.addEventListener('visibilitychange', onFocus); window.addEventListener('focus', onFocus)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onFocus); window.removeEventListener('focus', onFocus) }
  }, [load])

  function choose(next: Key | null) {
    setSelected(next)
    const url = new URL(window.location.href)
    if (next) url.searchParams.set('card', next); else url.searchParams.delete('card')
    window.history.replaceState(null, '', url)
  }
  const card = (key: Key, tone: 'violet' | 'amber' | 'pink' | 'mint', icon: React.ReactNode) => {
    const count = cards?.[key].length
    return <button type="button" className="metric-btn" aria-pressed={selected === key} disabled={!cards} onClick={() => choose(selected === key ? null : key)}
      aria-label={`${COPY[key].label}: ${count ?? 'loading'}. ${selected === key ? 'Hide' : 'Show'} the list`}>
      <MetricCard tone={tone} icon={icon} value={count ?? '…'} label={COPY[key].label} note={COPY[key].note} />
    </button>
  }
  const rows: CardRow[] = selected && cards ? cards[selected] : []

  return <section aria-label="Key numbers" style={{ marginBottom: 18 }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }}>
      {card('activeClients', 'violet', <IconClients />)}{card('waiting', 'amber', <IconHourglass />)}
      {card('pastDeadline', 'pink', <IconWarning />)}{card('overduePosts', 'mint', <IconCheck />)}
    </div>
    {error && <p role="alert" className="rv-error" style={{ marginTop: 10 }}>Could not load the numbers. <button type="button" className="cm-link" onClick={() => void load()}>Retry</button></p>}
    {selected && cards && <div className="card" style={{ padding: 20, marginTop: 14 }}>
      <div className="card-head" style={{ padding: '0 0 8px' }}><div className="card-title">{COPY[selected].label} · {rows.length}</div>
        <button type="button" className="btn-soft" onClick={() => choose(null)}>Clear filter</button></div>
      {!rows.length ? <p className="cm-meta">{COPY[selected].empty}</p> : <div style={{ overflowX: 'auto' }}><table className="data-table" style={{ width: '100%' }}>
        <thead><tr><th>{selected === 'activeClients' ? 'Client' : 'Idea'}</th><th>{selected === 'activeClients' ? 'Niche' : 'Client'}</th><th>Detail</th><th></th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.id}><td><b>{row.title}</b></td><td>{row.client}</td><td>{row.detail}</td>
          <td><Link href={row.href} className="cm-link">Open</Link></td></tr>)}</tbody></table></div>}
    </div>}
  </section>
}
