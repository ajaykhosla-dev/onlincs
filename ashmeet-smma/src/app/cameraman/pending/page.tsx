import Link from 'next/link'
import { requireGroupUser } from '@/lib/auth/session'
import { shootsFor } from '@/lib/phase4/data'

export default async function CameramanPendingPage() {
  const user = await requireGroupUser('cameraman')
  const shoots = (await shootsFor(user)).filter((s) => s.status !== 'cancelled' && s.status !== 'raw_uploaded' &&
    new Date(s.scheduled_end).getTime() < new Date().getTime() && s.ideas.some((idea) => !idea.raw_uploaded_at && !idea.files.length))
  return <section id="screen-pending"><div className="page-head"><h1>Pending uploads</h1><p>Past shoots with ideas still waiting for raw footage.</p></div>{shoots.length ? shoots.map((shoot) => <Link key={shoot.id} href={`/cameraman/shoots?shoot=${shoot.id}`} className="pending-card"><div className="pending-body"><div className="pending-title">{shoot.title}</div><div className="pending-meta">{shoot.client.name} · {new Date(shoot.scheduled_start).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' })} · {shoot.ideas.filter((i) => !i.raw_uploaded_at && !i.files.length).length} idea(s) pending</div></div><span aria-hidden="true">›</span></Link>) : <p>No uploads pending.</p>}</section>
}
