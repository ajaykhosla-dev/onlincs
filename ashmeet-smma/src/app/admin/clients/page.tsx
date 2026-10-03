import { ClientsTable } from '@/components/console/ClientsTable'
import { QueueList } from '@/components/console/QueueList'
import { FilterStrip, MetricCard, PillSelect } from '@/components/shared'
import { IconBriefcase, IconHourglass, IconReport, IconWarning } from '@/components/shared/icons'
import { clientRows, team, waitingOnYou } from '@/lib/fixtures/console'

const managers = ['All managers', ...team.filter((m) => m.role === 'brand_manager').map((m) => m.full_name)]
const niches = ['All niches', ...Array.from(new Set(clientRows.map((c) => c.niche)))]

export default function AdminClientsPage() {
  return (
    <>
      <section className="hero-row">
        <div className="hello">
          <h1>
            Hi Ashmeet!<span className="light">Who needs you today?</span>
          </h1>
          <p>Six accounts running, three managers, and nine things sitting on someone&apos;s approval.</p>
        </div>
        <MetricCard tone="violet" icon={<IconBriefcase />} badge="+1 this month" value={6} label="Active clients" note="Across 3 managers" />
        <MetricCard tone="amber" icon={<IconHourglass />} badge="6 external" value={9} label="Waiting on approval" note="3 sitting with your team" />
        <MetricCard tone="pink" icon={<IconWarning />} badge="6d oldest" value={4} label="Past deadline" note="Two clients affected" />
      </section>

      <FilterStrip label="Filter" actions>
        <PillSelect label="Manager" options={managers} />
        <PillSelect label="Niche" options={niches} />
        <PillSelect label="Status" options={['Any status', 'On track', 'Needs attention', 'Past deadline', 'Onboarding']} />
        <PillSelect label="Month" options={['September 2026', 'August 2026', 'July 2026']} />
      </FilterStrip>

      <div className="grid">
        <section className="card">
          <div className="card-head">
            <div className="card-title">All clients</div>
            <div className="card-tools">
              <button type="button" className="tool">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M11 5h10M11 12h10M11 19h10M4 7l2-2 2 2M6 5v14" />
                </svg>
                Sort
              </button>
              <button type="button" className="tool">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
                Edit columns
              </button>
            </div>
          </div>
          <ClientsTable rows={clientRows} showManager paged />
        </section>

        <aside className="side">
          <section className="card queue">
            <div className="card-head" style={{ padding: '0 0 4px' }}>
              <div className="card-title">Waiting on you</div>
              <div className="card-tools">
                <button type="button" className="tool">
                  Clear
                </button>
              </div>
            </div>
            <QueueList items={waitingOnYou} />
            <a href="#" className="queue-all">
              See all 9 items
            </a>
          </section>

          <section className="promo">
            <div className="promo-badge">
              <IconReport />
            </div>
            <h3 aria-level={2}>Scope check</h3>
            <p>Two accounts are tracking below half their monthly scope with seven days left.</p>
            <button type="button">Open report</button>
          </section>
        </aside>
      </div>
    </>
  )
}
