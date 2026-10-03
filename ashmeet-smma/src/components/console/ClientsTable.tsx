import { Avatar, DataTable, Pager, ProgressBar, Tag, type Column } from '@/components/shared'
import { scopePercent, teamById, type ClientRow } from '@/lib/fixtures/console'

const kebab = (name: string) => (
  <button type="button" className="kebab" aria-label={`Actions for ${name}`}>
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="12" cy="19" r="1.7" />
    </svg>
  </button>
)

/**
 * The Clients table. Admin shows the Manager column; a Brand Manager (whose own clients these are) does not.
 * `paged` adds the page buttons to the footer (Admin only, as in the prototypes).
 */
export function ClientsTable({
  rows,
  showManager,
  paged,
}: {
  rows: ClientRow[]
  showManager: boolean
  paged: boolean
}) {
  const columns: Column<ClientRow>[] = [
    {
      header: 'Client',
      cell: (c) => (
        <div className="client">
          <Avatar initials={c.monogram} gradient={c.gradient} />
          <div>
            <div className="client-name">{c.name}</div>
            <div className="client-sub">
              {c.handle} &middot; {c.code}
            </div>
          </div>
        </div>
      ),
    },
    { header: 'Niche', cell: (c) => <Tag variant={c.nicheTone}>{c.niche}</Tag> },
    ...(showManager
      ? [
          {
            header: 'Manager',
            cell: (c: ClientRow) => {
              const m = teamById(c.manager_id)
              return (
                <div className="mgr">
                  <Avatar kind="face" initials={m?.initials ?? ''} gradient={m?.avatar_gradient} /> {m?.first_name}
                </div>
              )
            },
          },
        ]
      : []),
    {
      header: 'Scope delivered',
      cell: (c) => {
        const pct = scopePercent(c)
        return (
          <div className="scope">
            <span className="scope-pct">{pct}%</span>
            <ProgressBar value={pct} tone={c.bar} />
            <span className="scope-n">
              {c.delivered}/{c.sow}
            </span>
          </div>
        )
      },
    },
    {
      header: 'Next shoot',
      cell: (c) => c.nextShoot ?? 'Not scheduled',
      tdStyle: (c) => ({
        fontSize: '12.5px',
        color: c.nextShoot ? 'var(--ink-soft)' : 'var(--muted)',
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }),
    },
    { header: 'Status', cell: (c) => <Tag variant={c.attention.tone}>{c.attention.label}</Tag> },
    { header: '', cell: (c) => kebab(c.name) },
  ]

  return (
    <>
      <DataTable columns={columns} rows={rows} rowKey={(c) => c.id} />
      <Pager
        note={
          <>
            Showing <b>{rows.length}</b> of <b>{rows.length}</b> clients
          </>
        }
        page={paged ? 1 : undefined}
        pages={paged ? 1 : undefined}
      />
    </>
  )
}
