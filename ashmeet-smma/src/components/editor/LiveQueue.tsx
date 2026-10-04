'use client'

import { useState } from 'react'
import { MediaPlayer } from './MediaPlayer'
import { MultipartUpload } from './MultipartUpload'
import type { EditorWork } from '@/lib/phase5/data'

function urgency(deadline: string | null) {
  if (!deadline) return 'No deadline'
  const today = new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'})
  if (deadline < today) return 'Overdue'
  if (deadline === today) return 'Due today'
  return new Date(`${deadline}T12:00:00`).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})
}

export function LiveQueue({ items, mode, name }: { items: EditorWork[]; mode: 'todo'|'redo'; name: string }) {
  const [selected,setSelected] = useState<string | null>(null)
  const item = items.find((entry) => entry.id === selected)
  return <section style={{ padding:28,overflowY:'auto' }}>
    <header className="hero-row" style={{ gridTemplateColumns:'1fr' }}><div className="hello"><h1>{mode === 'todo' ? `Hi ${name}!` : 'Re do'}</h1>
      <p>{mode === 'todo' ? 'Your assigned cuts, soonest deadline first.' : 'Review requested changes and submit a new version.'}</p></div></header>
    {item ? <>
      <button type="button" className="btn-soft" onClick={() => setSelected(null)}>Back to {mode === 'todo' ? 'To do' : 'Re do'}</button>
      <div className="grid" style={{ marginTop:16 }}><section className="card" style={{ padding:24 }}>
        <h2 className="card-title">{item.title} · {item.client_name}</h2>
        <p><strong>Deadline:</strong> {urgency(item.deadline)}</p>
        <div className="brief-row"><b>Concept</b><span>{item.concept || 'No concept added'}</span></div>
        <div className="brief-row"><b>Script</b><span>{item.script || 'No script added'}</span></div>
        {mode === 'redo' ? <div className="instr-compare">
          <div className="instr-col old"><h4>Original instructions</h4><p>{item.original_instructions || 'No original instructions saved'}</p></div>
          <div className="instr-col new"><h4>Current instructions</h4><p>{item.instructions_editor || 'No new instructions added'}</p></div>
        </div> : <div className="brief-row"><b>Instructions</b><span>{item.instructions_editor || 'No instructions added'}</span></div>}
        {item.reference_links.length > 0 && <div className="brief-row"><b>References</b><span>{item.reference_links.map((url,index) =>
          <a key={url+index} href={url} target="_blank" rel="noopener noreferrer" className="ref-link">Reference {index+1}</a>)}</span></div>}
        <h3 style={{ marginTop:20 }}>Raw footage</h3>
        {!item.raw.length && !item.folder_urls.length ? <p>Raw not available. No linked shoot has a Drive folder yet.</p> : <>
          {item.raw.length ? item.raw.map((file) => <p key={file.url}><a href={file.url} target="_blank" rel="noopener noreferrer">{file.name}</a></p>) : <p>Folder ready; no raw file registered yet.</p>}
          {item.folder_urls.map((url,index) => <p key={url}><a href={url} target="_blank" rel="noopener noreferrer">Open idea folder {index+1} in Drive</a></p>)}
        </>}
        {mode === 'redo' && item.versions.length > 0 && <><h3>Previous cut</h3>
          <p>Version {item.versions.at(-1)!.version} · {item.versions.at(-1)!.status.replaceAll('_',' ')}</p>
          <MediaPlayer versionId={item.versions.at(-1)!.id} title={`version ${item.versions.at(-1)!.version}`} />
          <h3>Change requests</h3>{item.comments.length ? item.comments.map((comment) => <div key={comment.id} className="comment">
            <div className="comment-head"><span className="comment-ts">{comment.timestamp_start == null ? 'General' : `${Math.floor(comment.timestamp_start/60)}:${String(Math.floor(comment.timestamp_start%60)).padStart(2,'0')}`}</span>
              <span className="comment-author">{comment.author_label}</span></div><div className="comment-text">{comment.body}</div></div>) : <p>No written change requests are attached to the previous version.</p>}</>}
        <MultipartUpload target={{ kind:'cut',itemId:item.id }} />
      </section><aside className="side"><section className="panel"><h3 className="card-title">Version history</h3>
        {item.versions.length ? [...item.versions].reverse().map((version) => <p key={version.id}>v{version.version} · {version.status.replaceAll('_',' ')} · {(version.file_size_bytes/1048576).toFixed(1)} MB</p>) : <p>First cut pending.</p>}
      </section></aside></div>
    </> : <>
      {!items.length && <div className="card" style={{ padding:24 }}>No {mode === 'todo' ? 'first cuts' : 'revisions'} are assigned to you right now.</div>}
      {items.map((entry) => <button type="button" key={entry.id} className="task-card" onClick={() => setSelected(entry.id)}>
        <div className="task-main"><div className="task-idea">{entry.title}</div><div className="task-meta">{entry.client_name} · {mode === 'redo' ? `previous cut v${entry.versions.at(-1)?.version}` : 'First cut'}</div></div>
        <span className={`task-urgency ${urgency(entry.deadline) === 'Overdue' ? 'u--today' : urgency(entry.deadline) === 'Due today' ? 'u--soon' : 'u--ok'}`}>{urgency(entry.deadline)}</span></button>)}
    </>}
  </section>
}
