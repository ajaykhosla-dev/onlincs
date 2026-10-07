'use client'
import { useCallback, useEffect, useState } from 'react'
import { MonthGrid, type MonthDay } from './MonthGrid'
import { ScheduleShootButton } from './ScheduleShootButton'
import { EditShootButton } from './EditShootButton'
import { SlideOver, Tag } from '@/components/shared'
import type { ShootView } from '@/lib/phase4/data'

const localDate = (utc: string) => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(utc))
const localTime = (utc: string) => new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(utc))
const initialMonth = '2026-09'
const shift = (month:string,n:number) => { const [y,m]=month.split('-').map(Number);return new Date(Date.UTC(y,m-1+n,1)).toISOString().slice(0,7) }
const arrival = (idea:ShootView['ideas'][number]) => idea.files.length ? `${idea.files.length} file${idea.files.length===1?'':'s'} arrived` :
  idea.activeUploads.length ? `Uploading ${Math.max(...idea.activeUploads.map((s)=>Math.round(s.bytes_received/s.file_size_bytes*100)))}%` :
  idea.raw_uploaded_at ? 'Marked raw uploaded' : 'Nothing started'

export function LiveShootCalendar({ admin }: { admin:boolean }) {
  const [shoots,setShoots]=useState<ShootView[]>([])
  const [month,setMonth]=useState(initialMonth)
  useEffect(()=>{queueMicrotask(()=>setMonth(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit'}).format(new Date())))},[])
  const [selected,setSelected]=useState<ShootView|null>(null)
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(true)
  const [now,setNow]=useState(0)
  useEffect(()=>{const tick=()=>setNow(new Date().getTime());tick();const timer=setInterval(tick,60000);return()=>clearInterval(timer)},[])
  const [options,setOptions]=useState<{items:{id:string;client_id:string;title:string}[];cameramen:{id:string;full_name:string}[]}>({items:[],cameramen:[]})
  const [adding,setAdding]=useState('')
  const [addMessage,setAddMessage]=useState('')
  const load=useCallback(async()=>{
    setLoading(true);setError('')
    try { const response=await fetch('/api/shoots',{cache:'no-store'});if(!response.ok)throw new Error('Could not load shoots');
      const data=await response.json();setShoots(data.shoots);setSelected((old)=>data.shoots.find((s:ShootView)=>s.id===old?.id)??null)
    } catch(e){setError(e instanceof Error?e.message:'Could not load shoots')}finally{setLoading(false)}
  },[])
  useEffect(()=>{queueMicrotask(()=>void load())},[load])
  useEffect(()=>{void fetch('/api/shoots/options').then((r)=>r.ok?r.json():{items:[],cameramen:[]}).then(setOptions)},[])
  const [year,index]=month.split('-').map(Number)
  const monthShoots=shoots.filter((s)=>localDate(s.scheduled_start).startsWith(month)&&s.status!=='cancelled')
  const days:Record<number,MonthDay>={}
  for(const shoot of monthShoots){const d=Number(localDate(shoot.scheduled_start).slice(-2));
    const current=days[d];days[d]={interactiveChildren:true,onClick:()=>setSelected(shoot),children:<div style={{display:'grid',gap:3}}>{current?.children}{<button key={shoot.id} type="button" className="cal-chip c--ram" onClick={()=>setSelected(shoot)}>{shoot.client.name} · {localTime(shoot.scheduled_start)}</button>}</div>}}
  const pending=shoots.filter((s)=>s.status!=='cancelled'&&new Date(s.scheduled_end).getTime()<now&&s.ideas.every((i)=>i.files.length===0))
  const reconciliation=shoots.flatMap((shoot)=>shoot.ideas.flatMap((idea)=>{
    const mismatched=idea.raw_uploaded_at&&idea.files.length===0
    const stalled=idea.activeUploads.some((s)=>new Date(s.last_progress_at??s.expires_at).getTime()<now-24*3600*1000)
    return mismatched||stalled?[{shoot,idea,reason:mismatched?'Marked uploaded, no file recorded':'Upload stalled for 24 hours'}]:[]
  }))
  async function retryFolder(id:string){const response=await fetch(`/api/shoots/${id}/provision`,{method:'POST'});const result=await response.json().catch(()=>({status:'failed'}));if(!response.ok){setError('Folder provisioning failed. Retry later.');setAddMessage('Idea saved; Drive folder is still pending.')}else setAddMessage(result.status==='complete'?'Drive folder ready.':'Idea saved; Drive folder is still pending.');await load()}
  async function addItem(){if(!selected||!adding)return;setAddMessage('Adding idea…');const response=await fetch(`/api/shoots/${selected.id}/items`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content_item_id:adding})});
    if(!response.ok){setAddMessage((await response.json().catch(()=>({}))).message??'Could not add idea');return}setAdding('');setAddMessage('Idea added. Preparing its Drive folder…');await load();void retryFolder(selected.id)}
  async function cancelShoot(){if(!selected||!window.confirm(`Cancel ${selected.title}?`))return;const response=await fetch(`/api/shoots/${selected.id}`,{method:'DELETE'});if(!response.ok){setError('Could not cancel shoot');return}setSelected(null);await load()}
  return <>
    <section className="hero-row" style={{gridTemplateColumns:'1fr'}}><div className="hello"><h1>Calendar<span className="light">Shoots and raw arrival</span></h1><p>{admin?'All client shoots':'Shoots for your clients'}</p></div></section>
    <section className="card" style={{padding:20,marginBottom:18}}><div className="card-head" style={{padding:0}}><div className="card-title">{new Date(Date.UTC(year,index-1,1)).toLocaleString('en-IN',{month:'long',year:'numeric',timeZone:'UTC'})}</div><div className="card-tools"><button className="tool" aria-label="Previous month" onClick={()=>setMonth(shift(month,-1))}>‹</button><button className="tool" aria-label="Next month" onClick={()=>setMonth(shift(month,1))}>›</button><ScheduleShootButton onCreated={()=>void load()} /></div></div></section>
    {error&&<section className="card" style={{padding:20,marginBottom:18}} role="alert">{error} <button onClick={()=>void load()}>Retry</button></section>}
    {loading?<section className="card" style={{padding:20}} role="status">Loading shoots…</section>:<div className="grid"><section className="card" style={{padding:22}}>{monthShoots.length===0&&<p>No shoots scheduled in this month.</p>}<MonthGrid year={year} month={index-1} days={days} /></section><aside className="side"><section className="card queue"><div className="card-head" style={{padding:0}}><div className="card-title">Upcoming shoots</div></div>{shoots.filter((s)=>s.status!=='cancelled'&&new Date(s.scheduled_start).getTime()>=now).slice(0,8).map((s)=><button className="shoot-row" key={s.id} onClick={()=>setSelected(s)}><span className="shoot-time">{localDate(s.scheduled_start)}<br />{localTime(s.scheduled_start)}</span><span className="shoot-body"><strong className="shoot-client">{s.title}</strong><span className="shoot-meta">{s.client.name} · {s.cameraman_name}</span></span></button>)}{!shoots.some((s)=>new Date(s.scheduled_start).getTime()>=now)&&<p>No upcoming shoots.</p>}</section><section className="card queue"><div className="card-head" style={{padding:0}}><div className="card-title">Pending shoots ({pending.length})</div></div>{pending.map((s)=><button className="shoot-row" key={s.id} onClick={()=>setSelected(s)}>{s.client.name} · {s.title}</button>)}{!pending.length&&<p>No raw pending.</p>}</section>{admin&&<section className="card queue"><div className="card-head" style={{padding:0}}><div className="card-title">Reconciliation ({reconciliation.length})</div></div>{reconciliation.map((r)=><button className="shoot-row" key={`${r.shoot.id}:${r.idea.content_item_id}`} onClick={()=>setSelected(r.shoot)}>{r.shoot.client.name} · {r.idea.item.title}: {r.reason}</button>)}{!reconciliation.length&&<p>Everything agrees.</p>}</section>}</aside></div>}
    <SlideOver open={!!selected} onClose={()=>setSelected(null)} title={selected?.client.name} ariaLabel="Shoot detail" closeLabel="Close shoot detail" flex>{selected&&<div style={{padding:20}}><h2>{selected.title}</h2><p>{localDate(selected.scheduled_start)} · {localTime(selected.scheduled_start)}–{localTime(selected.scheduled_end)} · {selected.location}</p><p>Cameraman: {selected.cameraman_name}</p><p><Tag variant={selected.folder_status==='complete'?'mint':'amber'}>{selected.folder_status==='complete'?'Drive folder ready':'Folder pending'}</Tag></p>{selected.drive_folder_link&&<p><a href={selected.drive_folder_link} target="_blank" rel="noopener noreferrer">Open shoot folder in Drive</a></p>}{selected.folder_status!=='complete'&&<button className="btn-soft" onClick={()=>void retryFolder(selected.id)}>Retry folder provisioning</button>}{selected.ideas.map((idea)=><div className="idea-block" key={idea.content_item_id}><h3>{idea.item.title}</h3><p>{arrival(idea)}</p><p>{idea.files.length} files · {Math.round(idea.files.reduce((sum,f)=>sum+f.size_bytes,0)/1024/1024)} MB</p>{idea.drive_subfolder_link&&<a href={idea.drive_subfolder_link} target="_blank" rel="noopener noreferrer">Open idea folder</a>}{idea.files.map((file)=><p key={file.id}><a href={file.drive_link} target="_blank" rel="noopener noreferrer">{file.file_name}</a> · {Math.round(file.size_bytes/1024/1024)} MB</p>)}</div>)}<p role="status">{selected.ideas.length} linked idea{selected.ideas.length===1?"":"s"}</p>{addMessage&&<p role="status">{addMessage}</p>}<div className="field" style={{marginTop:16}}><label htmlFor="add-shoot-item">Add idea to shoot</label><div style={{display:'flex',gap:8}}><select id="add-shoot-item" style={{flex:1,minWidth:0}} value={adding} onChange={(e)=>setAdding(e.target.value)}><option value="">Choose approved idea</option>{options.items.filter((item)=>item.client_id===selected.client_id&&!selected.ideas.some((idea)=>idea.content_item_id===item.id)).map((item)=><option key={item.id} value={item.id}>{item.title}</option>)}</select><button className="btn-soft" style={{flexShrink:0}} disabled={!adding} onClick={()=>void addItem()}>Add idea</button></div></div><div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:20,paddingTop:16,borderTop:'1px solid #F1F1F8'}}><EditShootButton key={selected.id} shoot={selected} cameramen={options.cameramen} onSaved={()=>void load()} /><button className="btn-soft" onClick={()=>void cancelShoot()}>Cancel shoot</button></div></div>}</SlideOver>
  </>
}
