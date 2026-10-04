import Link from 'next/link'
import { requireGroupUser } from '@/lib/auth/session'
import { shootsFor } from '@/lib/phase4/data'

export default async function EditorRawPage() {
  const user = await requireGroupUser('editor')
  const shoots = (await shootsFor(user)).filter((shoot) => shoot.ideas.some((idea) => idea.files.length || idea.raw_uploaded_at))
  const accessNote = <p>Your Google account needs read access to the agency Shared Drive. If a link requests access, ask your admin to add you.</p>
  return <section style={{ padding: 28, overflowY: 'auto' }}><h1>Raw footage</h1><p>Files for ideas assigned to you. Open them directly in Drive.</p>{accessNote}{shoots.length ? shoots.map((shoot) => <section className="card" key={shoot.id} style={{ padding: 20, marginTop: 16 }}><h2>{shoot.client.name} · {shoot.title}</h2><p>{new Date(shoot.scheduled_start).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}</p>{shoot.ideas.map((idea) => <div key={idea.content_item_id} style={{ marginTop: 16 }}><h3>{idea.item.title}</h3>{idea.files.length ? idea.files.map((file) => <p key={file.id}><a href={file.drive_link} target="_blank" rel="noopener noreferrer">{file.file_name}</a> · {Math.round(file.size_bytes / 1048576)} MB</p>) : <p>Marked uploaded; waiting for a file to appear in Drive.</p>}{idea.drive_subfolder_link && <p><a href={idea.drive_subfolder_link} target="_blank" rel="noopener noreferrer">Open idea folder</a></p>}</div>)}</section>) : <p>No raw files for your assigned ideas yet.</p>}<p><Link href="/editor/todo">Back to my edits</Link></p></section>
}
