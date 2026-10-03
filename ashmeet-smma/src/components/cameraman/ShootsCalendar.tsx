'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { SlideOver } from '@/components/shared'
import { camShoots, pendingShoots, NOW_HOUR, TODAY, type ShootState } from '@/lib/fixtures/cameraman'

// ── date helpers (all local time; "today" is fixed by the fixtures) ───────────────
// visually hidden heading: the screen has no visible title, but every page needs exactly one h1
const SR_ONLY = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' } as const
const ROWH = 52
const START_HOUR = 6
const END_HOUR = 21
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DOW_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const mk = (t: [number, number, number]) => new Date(t[0], t[1] - 1, t[2])
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const addDays = (d: Date, n: number) => {
  const c = new Date(d.getTime())
  c.setDate(c.getDate() + n)
  return c
}
const mondayOf = (d: Date) => addDays(d, -((d.getDay() + 6) % 7))
const dowIndex = (d: Date) => (d.getDay() + 6) % 7
const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)

function fmtTime(h: number) {
  const hh = Math.floor(h)
  const m = Math.round((h - hh) * 60)
  const ap = hh >= 12 ? 'PM' : 'AM'
  const h12 = hh % 12 === 0 ? 12 : hh % 12
  return `${h12}${m ? ':' + (m < 10 ? '0' : '') + m : ':00'} ${ap}`
}
const stateLabel = (s: ShootState) => (s === 'completed' ? 'Completed' : s === 'raw-missing' ? 'Raw missing' : 'Upcoming')

const TODAY_DATE = mk(TODAY)
const SHOOTS = camShoots.map((s) => ({ ...s, day: mk(s.date) }))
type Shoot = (typeof SHOOTS)[number]
const shootsOn = (d: Date) => SHOOTS.filter((s) => sameDay(s.day, d))
const nextAfter = (d: Date) =>
  SHOOTS.filter((s) => s.day > d)
    .sort((a, b) => a.day.getTime() - b.day.getTime())[0]

const Chevron = ({ d, w }: { d: string; w: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
)

function MiniCal({ month, selected, onPick, onNav }: { month: Date; selected: Date; onPick: (d: Date) => void; onNav: (n: number) => void }) {
  const leading = (month.getDay() + 6) % 7
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  return (
    <>
      <div className="mini-cal-head">
        <button type="button" className="mini-chevron" aria-label="Previous month" onClick={() => onNav(-1)}>
          <Chevron d="m15 18-6-6 6-6" w={2.3} />
        </button>
        <span className="mini-month-label">
          {MONTHS[month.getMonth()]} {month.getFullYear()}
        </span>
        <button type="button" className="mini-chevron" aria-label="Next month" onClick={() => onNav(1)}>
          <Chevron d="m9 18 6-6-6-6" w={2.3} />
        </button>
      </div>
      <div className="mini-cal-grid">
        {DOW.map((w) => (
          <div key={w} className="mini-dow">
            {w[0]}
          </div>
        ))}
        {Array.from({ length: leading }, (_, i) => (
          <div key={`b${i}`} className="mini-day is-blank" />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const dt = new Date(month.getFullYear(), month.getMonth(), i + 1)
          const has = shootsOn(dt).length > 0
          const cls = ['mini-day', sameDay(dt, TODAY_DATE) ? 'is-today' : '', sameDay(dt, selected) && !sameDay(dt, TODAY_DATE) ? 'is-selected' : '']
            .filter(Boolean)
            .join(' ')
          return (
            <button
              key={i}
              type="button"
              className={cls}
              aria-label={`${MONTHS[dt.getMonth()]} ${i + 1}, ${dt.getFullYear()}${has ? ' — has a shoot' : ''}`}
              onClick={() => onPick(dt)}
            >
              {i + 1}
              {has && <span className="mini-dot" />}
            </button>
          )
        })}
      </div>
    </>
  )
}

/** My shoots: the calendar-first home screen (mini month, week/day time grid, shoot detail sheet). */
export function ShootsCalendar() {
  // deep link from Pending uploads: /cameraman/shoots?shoot=<id> opens on that shoot's day with its detail sheet showing
  const params = useSearchParams()
  const jump = SHOOTS.find((x) => x.id === params.get('shoot')) ?? null
  const [selected, setSelected] = useState<Date>(jump?.day ?? TODAY_DATE)
  const [miniMonth, setMiniMonth] = useState<Date>(monthStart(jump?.day ?? TODAY_DATE))
  const [view, setView] = useState<'week' | 'day'>('week')
  const [stripOpen, setStripOpen] = useState(false)
  const [openShoot, setOpenShoot] = useState<Shoot | null>(jump)
  const [switches, setSwitches] = useState<Record<string, boolean>>({})
  const scrollRef = useRef<HTMLDivElement>(null)

  const go = (d: Date) => {
    setSelected(d)
    setMiniMonth(monthStart(d))
  }
  const goToday = () => go(TODAY_DATE)

  const days = view === 'day' ? [selected] : Array.from({ length: 7 }, (_, i) => addDays(mondayOf(selected), i))
  const isEmpty = view === 'day' && shootsOn(selected).length === 0
  const next = nextAfter(selected)
  const upNext = useMemo(() => nextAfter(TODAY_DATE), [])

  useEffect(() => {
    if (!isEmpty && scrollRef.current) scrollRef.current.scrollTop = Math.max(0, (8 - START_HOUR) * ROWH - 40)
  }, [selected, view, isEmpty])

  // header title
  let title: string
  if (view === 'day') {
    title = `${MONTHS[selected.getMonth()]} ${selected.getDate()}, ${selected.getFullYear()}`
  } else {
    const start = mondayOf(selected)
    const end = addDays(start, 6)
    if (start.getMonth() === end.getMonth()) title = `${start.getDate()} – ${end.getDate()} ${MONTHS[start.getMonth()]} ${start.getFullYear()}`
    else if (start.getFullYear() === end.getFullYear())
      title = `${start.getDate()} ${MONTHS[start.getMonth()]} – ${end.getDate()} ${MONTHS[end.getMonth()]} ${start.getFullYear()}`
    else title = `${start.getDate()} ${MONTHS[start.getMonth()]} ${start.getFullYear()} – ${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`
  }

  const emptyNextLabel = (() => {
    if (!next) return null
    const diff = Math.round((next.day.getTime() - selected.getTime()) / 86400000)
    const label = diff === 1 ? 'tomorrow' : diff > 1 && diff < 7 ? DOW[dowIndex(next.day)] : `${MONTHS[next.day.getMonth()]} ${next.day.getDate()}`
    return `Next: ${label}, ${fmtTime(next.start)} — ${next.client}`
  })()

  const mini = (
    <MiniCal
      month={miniMonth}
      selected={selected}
      onPick={go}
      onNav={(n) => setMiniMonth(new Date(miniMonth.getFullYear(), miniMonth.getMonth() + n, 1))}
    />
  )

  const stripStart = mondayOf(selected)

  return (
    <section id="screen-shoots">
      <h1 style={SR_ONLY}>My shoots</h1>
      <div className="cal-layout">
        {/* desktop sidebar */}
        <aside className="cal-sidebar">
          <button type="button" className="today-pill" onClick={goToday}>
            Today
          </button>
          {mini}

          {upNext && (
            <div className="upnext-card">
              <div className="upnext-label">Up next</div>
              <div className="upnext-client">{upNext.client}</div>
              <div className="upnext-meta">
                {Math.round((upNext.day.getTime() - TODAY_DATE.getTime()) / 86400000) === 1 ? 'Tomorrow' : DOW_LONG[dowIndex(upNext.day)]} &middot;{' '}
                {fmtTime(upNext.start)} &middot; {upNext.ideas.length} ideas
              </div>
            </div>
          )}

          <Link href="/cameraman/pending" className="pending-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
              <path d="M12 9v4.5M12 17.2h.01" />
            </svg>
            Pending uploads
            <span className="badge">{pendingShoots.length}</span>
          </Link>
        </aside>

        <div className="grid-area">
          {/* mobile day strip */}
          <div className="day-strip-wrap">
            <div className="day-strip-head">
              <button type="button" className="today-pill" style={{ margin: 0 }} onClick={goToday}>
                Today
              </button>
              <button type="button" className="day-strip-title" aria-expanded={stripOpen} onClick={() => setStripOpen(!stripOpen)}>
                {MONTHS[selected.getMonth()]} {selected.getFullYear()}
                <Chevron d="m6 9 6 6 6-6" w={2.3} />
              </button>
            </div>
            <div className="day-strip">
              {Array.from({ length: 7 }, (_, i) => {
                const dt = addDays(stripStart, i)
                const cls = ['strip-day', sameDay(dt, TODAY_DATE) ? 'is-today' : '', sameDay(dt, selected) && !sameDay(dt, TODAY_DATE) ? 'is-selected' : '']
                  .filter(Boolean)
                  .join(' ')
                return (
                  <button key={i} type="button" className={cls} onClick={() => go(dt)}>
                    <span className="strip-dow">{DOW[i][0]}</span>
                    <span className="strip-num">{dt.getDate()}</span>
                    {shootsOn(dt).length > 0 && <span className="strip-dot" />}
                  </button>
                )
              })}
            </div>
            <div className={`mobile-mini-cal${stripOpen ? ' is-open' : ''}`}>{mini}</div>
          </div>

          {/* header */}
          <div className="grid-header">
            <button type="button" className="gh-chevron" aria-label="Previous" onClick={() => go(addDays(selected, view === 'day' ? -1 : -7))}>
              <Chevron d="m15 18-6-6 6-6" w={2.3} />
            </button>
            <button type="button" className="gh-chevron" aria-label="Next" onClick={() => go(addDays(selected, view === 'day' ? 1 : 7))}>
              <Chevron d="m9 18 6-6-6-6" w={2.3} />
            </button>
            <button type="button" className="gh-today" onClick={goToday}>
              Today
            </button>
            <div className="grid-title">{title}</div>
            <div className="seg view-toggle" role="group" aria-label="View">
              <button type="button" className={view === 'week' ? 'is-active' : undefined} onClick={() => setView('week')}>
                Week
              </button>
              <button type="button" className={view === 'day' ? 'is-active' : undefined} onClick={() => setView('day')}>
                Day
              </button>
            </div>
          </div>

          <div className="day-columns-head" style={isEmpty ? { display: 'none' } : undefined}>
            <div className="dch-gutter" />
            {days.map((dt) => (
              <div key={dt.getTime()} className={`dch-day${sameDay(dt, TODAY_DATE) ? ' is-today' : ''}`}>
                <div className="dch-dow">{DOW[dowIndex(dt)]}</div>
                <div className="dch-num">{dt.getDate()}</div>
              </div>
            ))}
          </div>

          <div className="grid-scroll" ref={scrollRef} style={isEmpty ? { display: 'none' } : undefined}>
            <div className="grid-body">
              <div className="hour-gutter" style={{ height: (END_HOUR - START_HOUR) * ROWH }}>
                {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => {
                  const h = START_HOUR + i
                  return (
                    <div key={h} className="hour-label">
                      {h % 12 === 0 ? 12 : h % 12} {h >= 12 ? 'PM' : 'AM'}
                    </div>
                  )
                })}
              </div>
              <div className="day-columns">
                {days.map((dt) => (
                  <div key={dt.getTime()} className="day-col" style={{ height: (END_HOUR - START_HOUR) * ROWH }}>
                    {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
                      <div key={i} className="hour-row" />
                    ))}
                    {shootsOn(dt).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className={`evt${s.state === 'completed' ? ' is-completed' : s.state === 'raw-missing' ? ' is-raw-missing' : ''}`}
                        style={{ top: (s.start - START_HOUR) * ROWH + 2, height: Math.max((s.end - s.start) * ROWH - 4, 30) }}
                        aria-label={`${s.client}, ${s.name}, ${fmtTime(s.start)} to ${fmtTime(s.end)}, ${stateLabel(s.state)}`}
                        onClick={() => setOpenShoot(s)}
                      >
                        <div className="evt-time">
                          {fmtTime(s.start)}–{fmtTime(s.end)}
                        </div>
                        <div className="evt-client">{s.client}</div>
                        <div className="evt-meta">
                          {s.ideas.length} idea{s.ideas.length === 1 ? '' : 's'} · {stateLabel(s.state)}
                        </div>
                      </button>
                    ))}
                    {sameDay(dt, TODAY_DATE) && <div className="now-line" style={{ top: (NOW_HOUR - START_HOUR) * ROWH }} />}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={`grid-empty${isEmpty ? ' is-visible' : ''}`}>
            <p>No shoots today</p>
            <p className="grid-empty-next">{emptyNextLabel ?? 'No more shoots scheduled.'}</p>
            {next && (
              <button type="button" className="btn-dark" onClick={() => go(next.day)}>
                Jump to shoot
              </button>
            )}
          </div>
        </div>
      </div>

      <SlideOver open={!!openShoot} onClose={() => setOpenShoot(null)} title={openShoot?.client} ariaLabel="Shoot detail" closeLabel="Close shoot detail" flex>
        {openShoot && <ShootDetail shoot={openShoot} switches={switches} setSwitches={setSwitches} />}
      </SlideOver>
    </section>
  )
}

function ShootDetail({
  shoot: s,
  switches,
  setSwitches,
}: {
  shoot: Shoot
  switches: Record<string, boolean>
  setSwitches: (v: Record<string, boolean>) => void
}) {
  return (
    <>
      <div className="detail-hero">
        <h2>{s.name}</h2>
        <div className="detail-meta-row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          {DOW_LONG[dowIndex(s.day)]} {s.day.getDate()} {MONTHS[s.day.getMonth()]} · {fmtTime(s.start)}–{fmtTime(s.end)}
        </div>
        <div className="detail-meta-row" style={{ marginTop: 4 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z" />
            <circle cx="12" cy="9.5" r="2.3" />
          </svg>
          {s.location}
        </div>
        <span className={`detail-state st--${s.state}`}>{stateLabel(s.state)}</span>
      </div>

      {s.ideas.map((idea) => {
        const key = `${s.id}:${idea.name}`
        const on = switches[key] ?? s.state === 'completed'
        return (
          <div key={idea.name} className="idea-block">
            <div className="idea-name">{idea.name}</div>
            <div className="idea-field">
              <b>Concept</b>
              <p>{idea.concept}</p>
            </div>
            <div className="idea-field">
              <b>Script / talking points</b>
              <p>{idea.script}</p>
            </div>
            <a href="#" className="ref-btn" onClick={(e) => e.preventDefault()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 3h7v7M10 14 21 3M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6" />
              </svg>
              Reference link
            </a>
            {/* Opens our own upload wrapper (wired in Phase 4); the label and placement are the prototype's. */}
            <button type="button" className="upload-btn" aria-label={`Upload raw footage for ${idea.name}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3v12M7 8l5-5 5 5" />
                <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
              </svg>
              Upload raw footage
            </button>
            <div className="mark-row">
              <span className="mark-label">Mark raw uploaded</span>
              <button
                type="button"
                className={`switch${on ? ' is-on' : ''}`}
                aria-pressed={on}
                aria-label={`Mark raw uploaded for ${idea.name}`}
                onClick={() => setSwitches({ ...switches, [key]: !on })}
              />
            </div>
          </div>
        )
      })}
    </>
  )
}
