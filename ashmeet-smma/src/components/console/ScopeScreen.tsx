'use client'

import { useRouter } from 'next/navigation'
import { Tag } from '@/components/shared'
import type { SowResult } from '@/lib/analytics'
import type { SowStatus } from '@/lib/analytics/compute'

const STATUS: Record<SowStatus, { label: string; tone: 'mint' | 'pink' | 'sky' | 'amber' | 'grey' | 'lav' }> = {
  complete: { label: 'Complete', tone: 'mint' }, behind: { label: 'Behind pace', tone: 'pink' }, on_track: { label: 'On track', tone: 'sky' },
  onboarding: { label: 'Onboarding', tone: 'lav' }, no_scope: { label: 'No scope set', tone: 'grey' }, not_started: { label: 'Not started', tone: 'grey' },
}
const TYPE_LABEL = { reel: 'Reels', post: 'Posts', carousel: 'Carousels', story: 'Stories' } as const
const monthName = (month: string) => new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1)).toLocaleString('en-IN', { month: 'short', timeZone: 'UTC' })

/** Scope of work against delivered, with pace (not just totals) and a six-month trend. */
export function ScopeScreen({ data, basePath, canExport }: { data: SowResult; basePath: string; canExport: boolean }) {
  const router = useRouter()
  const behind = data.rows.filter((row) => row.status === 'behind').length
  return <>
    <section className="hero-row" style={{ gridTemplateColumns: '1fr' }}>
      <div className="hello"><h1>Scope of work<span className="light">Contracted against delivered</span></h1>
        <p>{behind ? `${behind} ${behind === 1 ? 'client is' : 'clients are'} behind the pace needed to finish the month.` : 'Every client is on pace for this month.'}</p></div>
    </section>
    <div className="card-tools" style={{ margin: '0 0 14px' }}>
      <label>Month <input type="month" value={data.month} onChange={(event) => event.target.value && router.push(`${basePath}?month=${event.target.value}`)} /></label>
      {canExport && <a className="btn-soft" href={`/api/export?view=scope&month=${data.month}`}>Download CSV</a>}
    </div>
    {!data.rows.length && <section className="card" style={{ padding: 22 }}>No clients to show.</section>}
    {data.rows.map((row) => {
      const percent = row.contracted ? Math.min(100, Math.round((row.delivered / row.contracted) * 100)) : 0
      const max = Math.max(1, ...row.trend.map((entry) => Math.max(entry.delivered, entry.contracted)))
      return <section className="card" key={row.client_id} style={{ padding: 22, marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <h2 className="card-title" style={{ margin: 0 }}>{row.client_name}</h2>
          <Tag variant={STATUS[row.status].tone}>{STATUS[row.status].label}</Tag>
        </div>
        <p style={{ margin: '8px 0 6px', fontWeight: 700 }}>{row.summary}</p>
        <div className="sow-bar" role="img" aria-label={`${row.delivered} of ${row.contracted} delivered`}><span style={{ width: `${percent}%` }} /></div>
        {row.status === 'behind' && <p className="rv-error" style={{ marginTop: 8 }}>Needs {row.remaining} more{row.daysLeft ? ` (about ${row.perDayNeeded} a day)` : ''}; pace says about {row.expected} should be done by now.</p>}
        {row.status === 'onboarding' && <p className="cm-meta" style={{ marginTop: 8 }}>New client: nothing delivered yet is expected.</p>}
        <div style={{ overflowX: 'auto', marginTop: 12 }}><table className="data-table" style={{ width: '100%' }}>
          <thead><tr><th>Type</th><th>Contracted</th><th>Delivered</th></tr></thead>
          <tbody>{(Object.keys(TYPE_LABEL) as (keyof typeof TYPE_LABEL)[]).map((type) => <tr key={type}>
            <td>{TYPE_LABEL[type]}</td><td>{row.byType[type].contracted}</td><td>{row.byType[type].delivered}</td></tr>)}
            <tr><td><b>Total</b></td><td><b>{row.contracted}</b></td><td><b>{row.delivered}</b></td></tr></tbody></table></div>
        <h3 className="card-title" style={{ marginTop: 14 }}>Last six months (delivered)</h3>
        <div className="trend" role="img" aria-label={`Delivered per month: ${row.trend.map((entry) => `${monthName(entry.month)} ${entry.delivered} of ${entry.contracted}`).join(', ')}`}>
          {row.trend.map((entry) => <div key={entry.month}><span>{entry.delivered}/{entry.contracted}</span>
            <i style={{ height: `${Math.max(4, (entry.delivered / max) * 36)}px` }} /><span>{monthName(entry.month)}</span></div>)}
        </div>
        {canExport && <p style={{ marginTop: 10 }}><a className="btn-soft" href={`/api/export/client-report?clientId=${row.client_id}&month=${data.month}`}>Monthly client report (CSV)</a></p>}
      </section>
    })}
  </>
}
