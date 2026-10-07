'use client'

// Scratch route: renders every shared primitive in every variant. Not linked from the app.
import { useState } from 'react'
import {
  Avatar,
  DataTable,
  EmptyState,
  FilterStrip,
  MetricCard,
  Modal,
  Pager,
  PillSelect,
  ProgressBar,
  Rail,
  SlideOver,
  Tag,
  TopNav,
  type TagVariant,
} from '@/components/shared'
import { IconCalendar, IconClients, IconDen, IconPlus, IconSettings, IconTodo, IconWarning, IconBriefcase, IconCheck, IconHourglass } from '@/components/shared/icons'
import '@/styles/screens/console-admin.css'
import '@/styles/screens/console-manager.css'

const TAGS: TagVariant[] = ['grey', 'lav', 'amber', 'pink', 'mint', 'sky']

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section style={{ margin: '0 0 36px' }}>
    <h2 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 12px' }}>{title}</h2>
    {children}
  </section>
)

export default function ComponentsScratchPage() {
  const [slide, setSlide] = useState(false)
  const [modal, setModal] = useState(false)
  const rows = [
    { id: 'a', name: 'First row', tone: 'mint' as const },
    { id: 'b', name: 'Second row', tone: 'amber' as const },
  ]

  return (
    <div className="r-console" style={{ padding: 28, maxWidth: 1180, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 24px' }}>Shared primitives</h1>

      <Section title="Rail (active state follows the URL; none here)">
        <div className="shell" style={{ height: 420, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
          <Rail
            initials="AC"
            items={[
              { key: 'a', label: 'Clients', href: '/admin/clients', icon: <IconClients /> },
              { key: 'b', label: 'Calendar', href: '/admin/calendar', icon: <IconCalendar /> },
              { key: 'c', label: "Editors' den", href: '/admin/den', icon: <IconDen />, badge: 4 },
              { key: 'd', label: 'To do', href: '/editor/todo', icon: <IconTodo /> },
            ]}
            foot={[{ key: 's', label: 'Settings', href: '/admin/settings', icon: <IconSettings /> }]}
          />
        </div>
      </Section>

      <Section title="TopNav: full, then reduced">
        <div className="shell" style={{ minHeight: 0, display: 'block' }}>
          <TopNav tabs={[{ label: 'Clients', icon: <IconClients />, active: true }, { label: 'Pipeline', icon: <IconCalendar /> }]} searchPlaceholder="Search">
            <button type="button" className="btn-dark">
              <IconPlus />
              Add client
            </button>
          </TopNav>
          <TopNav searchPlaceholder="Search your edits" />
        </div>
      </Section>

      <Section title="MetricCard: violet, amber, pink, mint (with and without badge)">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
          <MetricCard tone="violet" icon={<IconBriefcase />} badge="+1 this month" value={6} label="Active clients" note="Across 3 managers" />
          <MetricCard tone="amber" icon={<IconHourglass />} value={9} label="Waiting" note="No badge" />
          <MetricCard tone="pink" icon={<IconWarning />} badge="6d oldest" value={4} label="Past deadline" note="Two clients" />
          <MetricCard tone="mint" icon={<IconCheck />} value="2.1d" label="Turnaround" note="Mint variant" />
        </div>
      </Section>

      <Section title="FilterStrip with PillSelect, Reset and Apply">
        <FilterStrip label="Filter" actions>
          <PillSelect label="Manager" options={['All managers', 'Jaspreet Kaur']} />
          <PillSelect label="Month" options={['September 2026']} />
        </FilterStrip>
      </Section>

      <Section title="DataTable and Pager">
        <section className="card">
          <DataTable
            columns={[
              { header: 'Name', cell: (r: (typeof rows)[number]) => r.name },
              { header: 'State', cell: (r: (typeof rows)[number]) => <Tag variant={r.tone}>{r.tone}</Tag> },
            ]}
            rows={rows}
            rowKey={(r) => r.id}
          />
          <Pager note={<>Showing <b>2</b> of <b>2</b></>} page={1} pages={3} />
        </section>
      </Section>

      <Section title="Tag: every variant">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {TAGS.map((t) => (
            <Tag key={t} variant={t}>
              {t}
            </Tag>
          ))}
        </div>
      </Section>

      <Section title="Avatar: mono, face, square">
        <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          <Avatar initials="RD" gradient="linear-gradient(140deg,#8F80F7,#5A4AD8)" />
          <Avatar kind="face" initials="JK" gradient="linear-gradient(140deg,#8F80F7,#5A4AD8)" />
          <Avatar kind="square" initials="BC" gradient="linear-gradient(140deg,#62A0F2,#14539F)" />
        </div>
      </Section>

      <Section title="ProgressBar: default, warn, done">
        <div style={{ display: 'grid', gap: 12, maxWidth: 320 }}>
          <ProgressBar value={70} />
          <ProgressBar value={37} tone="warn" />
          <ProgressBar value={100} tone="done" />
        </div>
      </Section>

      <Section title="EmptyState">
        <div className="card">
          <EmptyState message="Nothing planned for this day." action={<button type="button" className="btn-dark">Plan</button>} />
        </div>
      </Section>

      <Section title="SlideOver and Modal (close on ×, Escape, backdrop; focus returns here)">
        <div style={{ display: 'flex', gap: 12 }}>
          <button type="button" className="btn-soft" onClick={() => setSlide(true)}>
            Open slide-over
          </button>
          <button type="button" className="btn-dark" onClick={() => setModal(true)}>
            Open modal
          </button>
        </div>
        <SlideOver open={slide} onClose={() => setSlide(false)} title="Slide-over" ariaLabel="Example slide-over" closeLabel="Close slide-over">
          <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Body content goes here.</p>
          <input type="text" aria-label="Example input" placeholder="Focus is trapped inside while open" />
        </SlideOver>
        <Modal
          open={modal}
          onClose={() => setModal(false)}
          titleId="scratch-modal-title"
          title="Modal"
          closeLabel="Close modal"
          footer={
            <button type="button" className="btn-dark" onClick={() => setModal(false)}>
              Done
            </button>
          }
        >
          <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Modal body.</p>
        </Modal>
      </Section>
    </div>
  )
}
