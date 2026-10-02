'use client'
import { TopNav } from '@/components/shared'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const PROTOTYPE_SHOOTS = [
  { id:'sh-6',  date:new Date(2026,8,20), start:9,  end:10.5, client:'Basil Café', name:'Founder day shoot', location:'Sarabha Nagar, Ludhiana', state:'raw-missing', ideas:[
    {name:'Founder day interview', concept:'Sit-down with the founder about why the café started.', script:'Ask: what made you open Basil Café?'},
    {name:'Kitchen morning routine', concept:'Early prep footage before opening.', script:'Handheld, fly-on-the-wall style.'},
  ]},
  { id:'sh-5',  date:new Date(2026,8,22), start:15, end:17,   client:'Ramana Dental', name:'Clinic b-roll',          location:'Model Town, Ludhiana',     state:'completed', ideas:[
    {name:'Clinic front desk b-roll', concept:'Clean establishing shots.', script:'Wide shot on arrival, slow pan.'},
    {name:'Equipment sterilization walkthrough', concept:'Footage of sterilization process.', script:'Macro shots of tools going through the autoclave.'},
  ]},
  { id:'sh-1',  date:new Date(2026,8,24), start:16, end:18,   client:'Sandhu Interiors', name:'Site visit',             location:'Sarabha Nagar, Ludhiana', state:'upcoming', ideas:[
    {name:'Modular kitchen reveal', concept:'Slow walkthrough of the finished modular kitchen.', script:'Start wide, then push in on storage features.'},
    {name:'Client testimonial — Mrs. Bedi', concept:'Seated interview with Mrs. Bedi.', script:'Ask: what made you choose Sandhu Interiors?'},
  ]},
  { id:'sh-2',  date:new Date(2026,8,25), start:9,  end:10.5, client:'Ramana Dental',    name:'Smile makeover shoot',   location:'Model Town, Ludhiana',     state:'upcoming', ideas:[
    {name:'Smile makeover before/after', concept:'Before/after footage.', script:'Symmetrical close-up shots, matched framing.'},
    {name:'Root canal myths', concept:'Talking-head setup for a myths-vs-facts explainer.', script:'Frame the doctor centre, clean background.'},
    {name:'New patient walk-in day', concept:'Footage of the new patient welcome process.', script:'Capture the check-in desk and consult room handoff.'},
  ]},
  { id:'sh-3',  date:new Date(2026,8,26), start:8,  end:9.5,  client:'Basil Café',      name:'New season menu',        location:'Sarabha Nagar, Ludhiana', state:'upcoming', ideas:[
    {name:'New season menu', concept:'Overhead shots of the five new dishes.', script:'Get close-up texture shots.'},
    {name:"Barista's pick", concept:"Barista making their favourite drink.", script:'Ask the barista to talk through what makes this drink their pick.'},
  ]},
]

export default function CameramanPendingPage() {
  const pending = PROTOTYPE_SHOOTS.filter(s => s.state === 'raw-missing')

  return (
    <>
      <TopNav title="Pending uploads" tabs={[]} showSearch={false} />

      <div style={{ padding: '22px 28px' }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: '-.01em' }}>Pending uploads</h1>
          <p style={{ margin: '6px 0 0', fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
            These shoots happened but no raw footage has been detected in Drive yet.
          </p>
        </div>

        {pending.map(s => (
          <button key={s.id} className="pending-card" style={{ width: '100%', textAlign: 'left', marginBottom: 14, border: 'none', cursor: 'pointer' }}>
            <div className="pending-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4.5M12 17.2h.01"/></svg>
            </div>
            <div className="pending-body">
              <div className="pending-title">{s.name}</div>
              <div className="pending-meta">{s.client} · shot {s.date.getDate()} {MONTHS[s.date.getMonth()]} · no raw detected</div>
            </div>
            <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        ))}
      </div>
    </>
  )
}
