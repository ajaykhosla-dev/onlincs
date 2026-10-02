'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { TopNav } from '@/components/shared'

// ── fixed "today" anchor: 23 Sep 2026 ──
const TODAY = new Date(2026, 8, 23)
const NOW_HOUR = 16 + 20 / 60
const ROWH = 52
const START_HOUR = 6
const END_HOUR = 21
const DOW = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function clone(d: Date) { return new Date(d.getTime()) }
function sameDay(a: Date, b: Date) { return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate() }
function addDays(d: Date, n: number) { const c=clone(d); c.setDate(c.getDate()+n); return c }
function mondayOf(d: Date) { return addDays(d, -((d.getDay()+6)%7)) }
function keyOf(d: Date) { return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}` }
function fmtTime(hDec: number) {
  const h = Math.floor(hDec)
  const m = Math.round((hDec-h)*60)
  const ap = h>=12 ? 'PM' : 'AM'
  const h12 = h%12 || 12
  return `${h12}${m?':'+(m<10?'0':'')+m:':00'} ${ap}`
}
function stateLabel(state: string) {
  return state==='completed' ? 'Completed' : state==='raw-missing' ? 'Raw missing' : 'Upcoming'
}

// prototype shoot data hardcoded (mirrors cameraman.html)
const PROTOTYPE_SHOOTS = [
  { id:'sh-6',  date:new Date(2026,8,20), start:9,  end:10.5, client:'Basil Café',      name:'Founder day shoot',      location:'Sarabha Nagar, Ludhiana', state:'raw-missing', ideas:[
    {name:'Founder day interview', concept:'Sit-down with the founder about why the café started.', script:'Ask: what made you open Basil Café?'},
    {name:'Kitchen morning routine', concept:'Early prep footage before opening.', script:'Handheld, fly-on-the-wall style.'},
  ]},
  { id:'sh-5',  date:new Date(2026,8,22), start:15, end:17,   client:'Ramana Dental',    name:'Clinic b-roll',          location:'Model Town, Ludhiana',     state:'completed', ideas:[
    {name:'Clinic front desk b-roll', concept:'Clean establishing shots.', script:'Wide shot on arrival, slow pan.'},
    {name:'Equipment sterilization walkthrough', concept:'Footage of sterilization process.', script:'Macro shots of tools going through the autoclave.'},
  ]},
  { id:'sh-1',  date:new Date(2026,8,24), start:16, end:18,   client:'Sandhu Interiors', name:'Site visit',             location:'Sarabha Nagar, Ludhiana', state:'upcoming', ideas:[
    {name:'Modular kitchen reveal', concept:'Slow walkthrough of the finished modular kitchen.', script:'Start wide, then push in on storage features.'},
    {name:'Client testimonial — Mrs. Bedi', concept:'Seated interview with Mrs. Bedi.', script:'Ask: what made you choose Sandhu Interiors?'},
  ]},
  { id:'sh-2',  date:new Date(2026,8,25), start:9,  end:10.5, client:'Ramana Dental',    name:'Smile makeover shoot',   location:'Model Town, Ludhiana',     state:'upcoming', ideas:[
    {name:'Smile makeover before/after', concept:'Before/after footage of a recent smile makeover patient.', script:'Symmetrical close-up shots, matched framing.'},
    {name:'Root canal myths', concept:'Talking-head setup for a myths-vs-facts explainer.', script:'Frame the doctor centre, clean background.'},
    {name:'New patient walk-in day', concept:'Footage of the new patient welcome process.', script:'Capture the check-in desk and consult room handoff.'},
  ]},
  { id:'sh-3',  date:new Date(2026,8,26), start:8,  end:9.5,  client:'Basil Café',      name:'New season menu',        location:'Sarabha Nagar, Ludhiana', state:'upcoming', ideas:[
    {name:'New season menu', concept:'Overhead shots of the five new dishes.', script:'Get close-up texture shots — steam, garnish, the pour.'},
    {name:"Barista's pick", concept:"Barista making their favourite drink from the new menu.", script:'Ask the barista to talk through what makes this drink their pick.'},
  ]},
]

const SHOTS_BY_KEY: Record<string, typeof PROTOTYPE_SHOOTS> = {}
PROTOTYPE_SHOOTS.forEach(s => {
  const k = keyOf(s.date)
  if (!SHOTS_BY_KEY[k]) SHOTS_BY_KEY[k] = []
  SHOTS_BY_KEY[k].push(s)
})

export default function CameramanShootsPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(clone(TODAY))
  const [miniMonth, setMiniMonth] = useState<Date>(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1))
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerShoot, setDrawerShoot] = useState<(typeof PROTOTYPE_SHOOTS)[0] | null>(null)
  const [mobileCalOpen, setMobileCalOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawerOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const goToday = useCallback(() => { setSelectedDate(clone(TODAY)); setMiniMonth(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1)) }, [])
  const nav = useCallback((dir: number) => {
    const d = viewMode === 'day' ? addDays(selectedDate, dir) : addDays(selectedDate, dir * 7)
    setSelectedDate(d); setMiniMonth(new Date(d.getFullYear(), d.getMonth(), 1))
  }, [selectedDate, viewMode])

  const openDrawer = (shoot: typeof PROTOTYPE_SHOOTS[0]) => { setDrawerShoot(shoot); setDrawerOpen(true) }

  // mini calendar cells
  const miniDays: (Date|null)[] = []
  const firstOfMonth = new Date(miniMonth.getFullYear(), miniMonth.getMonth(), 1)
  const leading = (firstOfMonth.getDay() + 6) % 7
  const daysInMonth = new Date(miniMonth.getFullYear(), miniMonth.getMonth() + 1, 0).getDate()
  for (let i = 0; i < leading; i++) miniDays.push(null)
  for (let d = 1; d <= daysInMonth; d++) miniDays.push(new Date(miniMonth.getFullYear(), miniMonth.getMonth(), d))

  // grid title
  let gridTitle: string
  if (viewMode === 'day') {
    gridTitle = `${MONTHS[selectedDate.getMonth()]} ${selectedDate.getDate()}, ${selectedDate.getFullYear()}`
  } else {
    const ws = mondayOf(selectedDate), we = addDays(ws, 6)
    if (ws.getMonth() === we.getMonth()) gridTitle = `${ws.getDate()} – ${we.getDate()} ${MONTHS[ws.getMonth()]} ${ws.getFullYear()}`
    else if (ws.getFullYear() === we.getFullYear()) gridTitle = `${ws.getDate()} ${MONTHS[ws.getMonth()]} – ${we.getDate()} ${MONTHS[we.getMonth()]} ${ws.getFullYear()}`
    else gridTitle = `${ws.getDate()} ${MONTHS[ws.getMonth()]} ${ws.getFullYear()} – ${we.getDate()} ${MONTHS[we.getMonth()]} ${we.getFullYear()}`
  }

  const days: Date[] = viewMode === 'day'
    ? [selectedDate]
    : Array.from({ length: 7 }, (_, i) => addDays(mondayOf(selectedDate), i))

  const isEmpty = viewMode === 'day' && (SHOTS_BY_KEY[keyOf(selectedDate)]?.length || 0) === 0
  const nextShoot = PROTOTYPE_SHOOTS.filter(s => s.date > TODAY).sort((a, b) => a.date.getTime() - b.date.getTime())[0]
  const pendingCount = PROTOTYPE_SHOOTS.filter(s => s.state === 'raw-missing').length

  return (
    <>
      <TopNav title="Calendar" tabs={[]} showSearch={false}
        rightSlot={
          <div className="seg view-toggle" role="group" aria-label="View">
            <button className={viewMode==='week'?'is-active':''} onClick={()=>setViewMode('week')}>Week</button>
            <button className={viewMode==='day'?'is-active':''} onClick={()=>setViewMode('day')}>Day</button>
          </div>
        }
      />

      <div className="offline-banner is-visible">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1l22 22M16.7 16.7A8 8 0 0 0 5 18.3M8.5 12.5a5 5 0 0 1 4-1.9M2 8.8A11 11 0 0 1 5.6 6.4M22 8.8a11 11 0 0 0-3.2-2.6"/><path d="M12 20h.01"/></svg>
        You&apos;re offline — your schedule is saved and will sync when you reconnect.
      </div>

      {/* mobile day strip */}
      <div className="day-strip-wrap">
        <div className="day-strip-head">
          <button className="today-pill" style={{ margin:0 }} onClick={goToday}>Today</button>
          <button className="day-strip-title" onClick={()=>setMobileCalOpen(!mobileCalOpen)} aria-expanded={mobileCalOpen}>
            {MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear()}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </button>
        </div>
        <div className="day-strip">
          {days.map((dt,i)=>(
            <button key={i} type="button" className={`strip-day ${sameDay(dt,TODAY)?'is-today':''} ${sameDay(dt,selectedDate)&&!sameDay(dt,TODAY)?'is-selected':''}`}>
              <span className="strip-dow">{DOW[(dt.getDay()+6)%7][0]}</span>
              <span className="strip-num">{dt.getDate()}</span>
              {(SHOTS_BY_KEY[keyOf(dt)]?.length||0)>0 && <span className="strip-dot"/>}
            </button>
          ))}
        </div>
        <div className={`mobile-mini-cal ${mobileCalOpen?'is-open':''}`}>
          <div className="mini-cal-head">
            <button className="mini-chevron" onClick={()=>setMiniMonth(new Date(miniMonth.getFullYear(),miniMonth.getMonth()-1,1))} aria-label="Previous month">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <span className="mini-month-label">{MONTHS[miniMonth.getMonth()]} {miniMonth.getFullYear()}</span>
            <button className="mini-chevron" onClick={()=>setMiniMonth(new Date(miniMonth.getFullYear(),miniMonth.getMonth()+1,1))} aria-label="Next month">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>
          <div className="mini-cal-grid">
            {miniDays.map((dt,i)=>{
              if(!dt) return <div key={i} className="mini-dow"/>
              const sc = SHOTS_BY_KEY[keyOf(dt)]?.length||0
              return <button key={i} type="button" className={`mini-day ${sameDay(dt,TODAY)?'is-today':''} ${sameDay(dt,selectedDate)&&!sameDay(dt,TODAY)?'is-selected':''}`}>
                {dt.getDate()}{sc>0&&<span className="mini-dot"/>}
              </button>
            })}
          </div>
        </div>
      </div>

      {/* desktop sidebar */}
      {!isEmpty && viewMode==='week' && (
        <div className="cal-sidebar">
          <button className="today-pill" onClick={goToday}>Today</button>
          <div className="mini-cal-head">
            <button className="mini-chevron" onClick={()=>setMiniMonth(new Date(miniMonth.getFullYear(),miniMonth.getMonth()-1,1))} aria-label="Previous month">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <span className="mini-month-label">{MONTHS[miniMonth.getMonth()]} {miniMonth.getFullYear()}</span>
            <button className="mini-chevron" onClick={()=>setMiniMonth(new Date(miniMonth.getFullYear(),miniMonth.getMonth()+1,1))} aria-label="Next month">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>
          <div className="mini-cal-grid">
            {miniDays.map((dt,i)=>{
              if(!dt) return <div key={i} className="mini-dow"/>
              const sc = SHOTS_BY_KEY[keyOf(dt)]?.length||0
              return <button key={i} type="button" className={`mini-day ${sameDay(dt,TODAY)?'is-today':''} ${sameDay(dt,selectedDate)&&!sameDay(dt,TODAY)?'is-selected':''}`}>
                {dt.getDate()}{sc>0&&<span className="mini-dot"/>}
              </button>
            })}
          </div>

          <div className="upnext-card">
            <div className="upnext-label">Up next</div>
            <div className="upnext-client">{nextShoot?.client || '—'}</div>
            <div className="upnext-meta">
              {nextShoot ? `${MONTHS[(nextShoot.date.getDay()+6)%7]} · ${fmtTime(nextShoot.start)} · ${nextShoot.name}` : 'No upcoming shoots'}
            </div>
          </div>

          <a href="/cameraman/pending" className="pending-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4.5M12 17.2h.01"/></svg>
            Pending uploads
            <span className="badge">{pendingCount}</span>
          </a>
        </div>
      )}

      {/* grid area */}
      <div className="grid-area">
        <div className="grid-header">
          <button className="gh-chevron" onClick={()=>nav(-1)} aria-label="Previous">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <button className="gh-chevron" onClick={()=>nav(1)} aria-label="Next">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
          <button className="gh-today" onClick={goToday}>Today</button>
          <div className="grid-title">{gridTitle}</div>
        </div>

        {!isEmpty && (
          <>
            <div className="day-columns-head">
              <div className="dch-gutter"/>
              {days.map((dt,i)=>(
                <div key={i} className={`dch-day ${sameDay(dt,TODAY)?'is-today':''}`}>
                  <div className="dch-dow">{DOW[(dt.getDay()+6)%7]}</div>
                  <div className="dch-num">{dt.getDate()}</div>
                </div>
              ))}
            </div>
            <div className="grid-scroll">
              <div className="grid-body">
                <div className="hour-gutter" style={{height:(END_HOUR-START_HOUR+1)*ROWH}}>
                  {Array.from({length:END_HOUR-START_HOUR+1},(_,i)=>{
                    const h=START_HOUR+i; const ap=h>=12?'PM':'AM'; const h12=h%12||12
                    return <div key={i} className="hour-label">{h12} {ap}</div>
                  })}
                </div>
                <div className="day-columns">
                  {days.map((dt,ci)=>{
                    const dayShoots = SHOTS_BY_KEY[keyOf(dt)]||[]
                    return (
                      <div key={ci} className="day-col" style={{height:(END_HOUR-START_HOUR)*ROWH}}>
                        {Array.from({length:END_HOUR-START_HOUR},(_,i)=><div key={i} className="hour-row"/>)}
                        {dayShoots.map(s=>{
                          const top = (s.start-START_HOUR)*ROWH+2
                          const height = Math.max((s.end-s.start)*ROWH-4,30)
                          return (
                            <button key={s.id} type="button" className={`evt ${s.state==='completed'?'is-completed':s.state==='raw-missing'?'is-raw-missing':''}`}
                              style={{top,height}} onClick={()=>openDrawer(s)}
                              aria-label={`${s.client}, ${s.name}, ${fmtTime(s.start)} to ${fmtTime(s.end)}, ${stateLabel(s.state)}`}>
                              <div className="evt-time">{fmtTime(s.start)}–{fmtTime(s.end)}</div>
                              <div className="evt-client">{s.client}</div>
                              <div className="evt-meta">{dayShoots.length} ideas · {stateLabel(s.state)}</div>
                            </button>
                          )
                        })}
                        {sameDay(dt,TODAY) && <div className="now-line" style={{top:(NOW_HOUR-START_HOUR)*ROWH}}/>}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        <div className={`grid-empty ${isEmpty?'is-visible':''}`} style={{display:isEmpty?'flex':'none'}}>
          <p>No shoots today</p>
          <p className="grid-empty-next">
            {nextShoot?`Next: ${MONTHS[(nextShoot.date.getDay()+6)%7]}, ${fmtTime(nextShoot.start)} — ${nextShoot.client}`:'No more shoots scheduled.'}
          </p>
          {nextShoot && <button className="btn-dark" onClick={()=>{setSelectedDate(clone(nextShoot.date));setViewMode('day')}}>Jump to shoot</button>}
        </div>
      </div>

      {/* shoot detail drawer */}
      {drawerOpen && drawerShoot && (
        <>
          <div className="drawer-backdrop" onClick={()=>setDrawerOpen(false)}/>
          <div className="drawer" style={{width:'480px',display:'flex',flexDirection:'column'}} role="dialog" aria-modal="true" aria-label="Shoot detail">
            <div className="modal-head" style={{position:'sticky',top:0,background:'var(--surface)',zIndex:2}}>
              <span className="modal-title">{drawerShoot.client}</span>
              <button className="modal-close" onClick={()=>setDrawerOpen(false)} aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div style={{flex:1,padding:'18px 24px',overflowY:'auto'}}>
              <div className="detail-hero">
                <h2>{drawerShoot.name}</h2>
                <div className="detail-meta-row">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14,flexShrink:0}}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                  {MONTHS[(drawerShoot.date.getDay()+6)%7]} {drawerShoot.date.getDate()} {MONTHS[drawerShoot.date.getMonth()]} · {fmtTime(drawerShoot.start)}–{fmtTime(drawerShoot.end)}
                </div>
                <div className="detail-meta-row" style={{marginTop:4}}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14,flexShrink:0}}><path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.3"/></svg>
                  {drawerShoot.location}
                </div>
                <span className={`detail-state st--${drawerShoot.state}`}>{stateLabel(drawerShoot.state)}</span>
              </div>

              {drawerShoot.ideas.map((idea,i)=>(
                <div key={i} className="idea-block">
                  <div className="idea-name">{idea.name}</div>
                  <div className="idea-field"><b>Concept</b><p>{idea.concept||'—'}</p></div>
                  <div className="idea-field"><b>Script / talking points</b><p>{idea.script||'—'}</p></div>
                  <a href="#" className="ref-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    Reference link
                  </a>
                  <button className="upload-btn" aria-label={`Upload raw footage for ${idea.name}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M7 8l5-5 5 5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>
                    Upload raw footage
                  </button>
                  <div className="mark-row">
                    <span className="mark-label">Mark raw uploaded</span>
                    <button className={`switch ${drawerShoot.state==='completed'?'is-on':''}`}
                      aria-pressed={drawerShoot.state==='completed'} aria-label={`Mark raw uploaded for ${idea.name}`}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}
