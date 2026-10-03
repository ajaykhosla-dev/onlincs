import { Avatar, DataTable, MetricCard, Tag, type Column } from '@/components/shared'
import { IconCheck, IconHourglass, IconWarning } from '@/components/shared/icons'
import { teamById } from '@/lib/fixtures/console'
import { teamPerformance, type PerformanceRow } from '@/lib/fixtures/console-screens'

const columns: Column<PerformanceRow>[] = [
  {
    header: 'Member',
    cell: (r) => {
      const m = teamById(r.memberId)
      return (
        <div className="client">
          <Avatar initials={m?.initials ?? ''} gradient={m?.avatar_gradient} />
          <div className="client-name">{m?.full_name}</div>
        </div>
      )
    },
  },
  { header: 'Role', cell: (r) => <Tag variant={r.roleTone}>{r.roleLabel}</Tag> },
  { header: 'Assigned clients', cell: (r) => r.assigned, tdStyle: { fontSize: '12.5px', color: 'var(--ink-soft)' } },
  { header: 'Delivered', cell: (r) => r.delivered, tdStyle: { fontWeight: 700 } },
  { header: 'Revisions / item', cell: (r) => r.revisions },
  { header: 'Avg turnaround', cell: (r) => r.turnaround },
  { header: 'On-time rate', cell: (r) => <Tag variant={r.onTime.tone}>{r.onTime.label}</Tag> },
]

export default function AdminTeamPage() {
  return (
    <>
      <section className="hero-row">
        <div className="hello">
          <h1>
            Team<span className="light">Who&apos;s actually doing the work</span>
          </h1>
          <p>Scope of work versus what&apos;s landed, per person, this month.</p>
        </div>
        <MetricCard tone="violet" icon={<IconCheck />} value={101} label="Items delivered" note="This month, across the team" />
        <MetricCard tone="mint" icon={<IconHourglass />} value="2.1d" label="Avg. turnaround" note="Assigned to delivered" />
        <MetricCard tone="amber" icon={<IconWarning />} value="84%" label="On-time rate" note="Team average" />
      </section>

      <section className="card">
        <div className="card-head">
          <div className="card-title">Performance this month</div>
        </div>
        <DataTable columns={columns} rows={teamPerformance} rowKey={(r) => r.memberId} />
      </section>
    </>
  )
}
