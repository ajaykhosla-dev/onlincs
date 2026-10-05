'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Avatar, MetricCard, SlideOver, Tag } from '@/components/shared'
import { IconCheck, IconHourglass, IconWarning } from '@/components/shared/icons'
import { hoursLabel } from '@/lib/analytics/format'
import type { TeamMember } from '@/lib/analytics'
import type { AgencyMetrics } from '@/lib/analytics/compute'

type Group = { role: string; label: string; members: TeamMember[] }
type Key = 'name' | 'clients' | 'throughput' | 'revision_rate' | 'median_turnaround_hours' | 'on_time_rate'

const THROUGHPUT_LABEL: Record<string, string> = { editor: 'Cuts submitted', brand_manager: 'Items posted', cameraman: 'Shoots completed', admin: 'Activity' }
const pct = (value: number, samples: number) => samples ? `${value}%` : '—'
const initials = (name: string) => name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
const tone = (rate: number, samples: number) => !samples ? 'grey' as const : rate >= 80 ? 'mint' as const : rate >= 60 ? 'amber' as const : 'pink' as const

export function TeamScreen({ month, agency, groups }: { month: string; agency: AgencyMetrics; groups: Group[] }) {
  const router = useRouter()
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: 'name', dir: 1 })
  const [open, setOpen] = useState<TeamMember | null>(null)

  const value = (member: TeamMember, key: Key) => key === 'name' ? member.name.toLowerCase() : key === 'clients' ? member.clients.length : member[key]
  const sorted = (members: TeamMember[]) => [...members].sort((a, b) => {
    const left = value(a, sort.key), right = value(b, sort.key)
    return (left < right ? -1 : left > right ? 1 : 0) * sort.dir
  })
  const header = (key: Key, label: string) => <th aria-sort={sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
    <button type="button" className="th-sort" onClick={() => setSort((current) => ({ key, dir: current.key === key && current.dir === 1 ? -1 : 1 }))}>
      {label}{sort.key === key ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}</button></th>

  return <>
    <section className="hero-row">
      <div className="hello"><h1>Team<span className="light">Workload and flow, not a leaderboard</span></h1>
        <p>What each person moved forward this month. People are grouped by role because a cameraman and an editor do different work.</p></div>
      <MetricCard tone="violet" icon={<IconCheck />} value={agency.throughput} label="Items posted" note="Throughput this month, agency-wide" />
      <MetricCard tone="mint" icon={<IconHourglass />} value={hoursLabel(agency.median_turnaround_hours)} label="Median turnaround" note={`Raw uploaded to cut submitted · ${agency.turnaround_samples} cuts`} />
      <MetricCard tone="amber" icon={<IconWarning />} value={pct(agency.on_time_rate, agency.on_time_samples)} label="On-time rate" note={`Posted by the scheduled time · ${agency.on_time_samples} posts`} />
    </section>
    <div className="card-tools" style={{ margin: '0 0 14px' }}>
      <label>Month <input type="month" value={month} onChange={(event) => event.target.value && router.push(`/admin/team?month=${event.target.value}`)} /></label>
    </div>

    {groups.map((group) => <section className="card" key={group.role} style={{ marginBottom: 18 }}>
      <div className="card-head"><div className="card-title">{group.label}</div></div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ width: '100%' }}>
          <thead><tr>{header('name', 'Member')}<th>Role</th>{header('clients', 'Assigned clients')}{header('throughput', THROUGHPUT_LABEL[group.role])}
            {header('revision_rate', 'Revisions / item')}{header('median_turnaround_hours', 'Median turnaround')}{header('on_time_rate', 'On-time rate')}</tr></thead>
          <tbody>{sorted(group.members).map((member) => <tr key={member.user_id}>
            <td><button type="button" className="th-sort" onClick={() => setOpen(member)} aria-label={`Open ${member.name}`}>
              <span className="client"><Avatar initials={initials(member.name)} /><span className="client-name">{member.name}</span></span></button></td>
            <td><Tag variant="lav">{group.label.replace(/s$/, '')}</Tag></td>
            <td style={{ fontSize: '12.5px', color: 'var(--ink-soft)' }}>{member.clients.length ? member.clients.map((client) => client.name).join(', ') : '—'}</td>
            <td style={{ fontWeight: 700 }}>{member.throughput}</td>
            <td>{member.role === 'cameraman' || member.role === 'admin' ? '—' : member.revision_rate}</td>
            <td>{member.role === 'cameraman' || member.role === 'admin' ? '—' : hoursLabel(member.median_turnaround_hours)}</td>
            <td>{member.role === 'brand_manager' ? <Tag variant={tone(member.on_time_rate, member.on_time_samples)}>{pct(member.on_time_rate, member.on_time_samples)}</Tag> : '—'}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>)}

    <SlideOver open={!!open} onClose={() => setOpen(null)} ariaLabel="Team member detail" closeLabel="Close member detail" title={open?.name ?? ''}>
      {open && <div style={{ padding: '4px 22px 22px', display: 'grid', gap: 14 }}>
        <p className="cm-meta">{THROUGHPUT_LABEL[open.role]}: <b>{open.throughput}</b> · Revisions per item: <b>{open.revision_rate}</b> · Median turnaround: <b>{hoursLabel(open.median_turnaround_hours)}</b></p>
        <section><h3 className="card-title">Activity over the month</h3>
          <p className="cm-meta">Actions per week: {open.weekly.map((count, index) => `week ${index + 1}: ${count}`).join(' · ')}</p>
          {open.activity.length ? <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7 }}>{open.activity.map((entry) => <li key={entry.at + entry.text}>
            {new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(entry.at))} · {entry.text}</li>)}</ul>
            : <p className="cm-meta">No recorded activity this month.</p>}</section>
        <section><h3 className="card-title">Clients</h3>
          <p className="cm-meta">{open.clients.length ? open.clients.map((client) => client.name).join(', ') : 'No clients yet.'}</p></section>
        <section><h3 className="card-title">Open work</h3>
          {open.open.length ? <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7 }}>{open.open.map((work, index) => <li key={index}>
            {work.title} · {work.client} · {work.status.replaceAll('_', ' ')}{work.deadline ? ` · due ${work.deadline}` : ''}</li>)}</ul>
            : <p className="cm-meta">Nothing open right now.</p>}</section>
      </div>}
    </SlideOver>
  </>
}
