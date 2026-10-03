import { ClientsTable } from '@/components/console/ClientsTable'
import { QueueList } from '@/components/console/QueueList'
import { ScopeBanner } from '@/components/console/ScopeBanner'
import { MetricCard } from '@/components/shared'
import { IconBriefcase, IconCheck, IconHourglass, IconReport } from '@/components/shared/icons'
import { jaspreetClients, waitingOnJaspreet } from '@/lib/fixtures/console'

export default function ManagerClientsPage() {
  return (
    <>
      <ScopeBanner>Your clients &mdash; Ramana Dental and Grover Motors only</ScopeBanner>

      <section className="hero-row">
        <div className="hello">
          <h1>
            Hi Jaspreet!<span className="light">Here&apos;s where your two accounts stand.</span>
          </h1>
          <p>Ramana Dental has two approvals waiting on you. Grover Motors is fully on track this month.</p>
        </div>
        <MetricCard tone="violet" icon={<IconBriefcase />} value={2} label="Your clients" note="Ramana Dental, Grover Motors" />
        <MetricCard tone="amber" icon={<IconHourglass />} value={2} label="Waiting on approval" note="Both on Ramana Dental" />
        <MetricCard tone="mint" icon={<IconCheck />} value={0} label="Past deadline" note="Both accounts on schedule" />
      </section>

      <div className="grid">
        <section className="card">
          <div className="card-head">
            <div className="card-title">Your clients</div>
          </div>
          <ClientsTable rows={jaspreetClients} showManager={false} paged={false} />
        </section>

        <aside className="side">
          <section className="card queue">
            <div className="card-head" style={{ padding: '0 0 4px' }}>
              <div className="card-title">Waiting on you</div>
            </div>
            <QueueList items={waitingOnJaspreet} />
          </section>

          <section className="promo">
            <div className="promo-badge">
              <IconReport />
            </div>
            <h3 aria-level={2}>Ramana Dental</h3>
            <p>70% of this month&apos;s scope delivered with 7 days left &mdash; on pace to finish on time.</p>
            <button type="button">Open report</button>
          </section>
        </aside>
      </div>
    </>
  )
}
