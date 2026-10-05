import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { getCurrentUser } from '@/lib/auth/current-user'
import { badRequest, forbidden, unauthorized } from '@/lib/api'
import { sowAnalytics, teamAnalytics } from '@/lib/analytics'
import { dashboardCards, type Cards } from '@/lib/analytics/cards'
import { clientDashboard } from '@/lib/phase3/data'
import { monthSchema } from '@/lib/phase3/schemas'
import { postingData } from '@/lib/phase7/data'
import { istDateTime } from '@/lib/phase7/format'
import { hoursLabel } from '@/lib/analytics/format'
import { fileSlug, toCsv, type Cell } from '@/lib/export/csv'
import { supabaseAdmin } from '@/lib/supabase/admin'

const CARDS = ['activeClients', 'waiting', 'pastDeadline', 'overduePosts'] as const

/**
 * CSV of the view the user is looking at, built from the same functions the screens use, so the file matches the
 * rows on screen. It is scoped by role (a brand manager's file holds only their clients) and every export is logged.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  if (!['admin', 'brand_manager', 'platform_owner'].includes(user.role)) return forbidden()
  const params = new URL(request.url).searchParams
  const view = params.get('view') ?? 'clients'
  const month = params.get('month') ?? new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).slice(0, 7)
  if (!monthSchema.safeParse(month).success) return badRequest('Invalid month')
  const isAdmin = user.role === 'admin' || user.role === 'platform_owner'

  let header: string[] = [], rows: Cell[][] = [], name = view
  try {
    if (view === 'clients') {
      const { clients, managers } = await clientDashboard(user, month)
      header = ['Client', 'Code', 'Niche', 'Brand manager', 'Status', 'Reels', 'Posts', 'Carousels', 'Stories', 'Scope total', 'Delivered', 'Percent delivered']
      rows = clients.map((client) => {
        const scope = client.scope, total = scope ? scope.reel_count + scope.post_count + scope.carousel_count + scope.story_count : 0
        return [client.name, client.code, client.niche, managers.find((m) => m.id === client.manager_id)?.full_name ?? '', client.status,
          scope?.reel_count ?? 0, scope?.post_count ?? 0, scope?.carousel_count ?? 0, scope?.story_count ?? 0, total, client.delivered, total ? Math.min(100, Math.round((client.delivered / total) * 100)) : 0]
      })
      name = `clients-${month}`
    } else if (view === 'scope') {
      const { rows: sow } = await sowAnalytics(user, month, true)
      header = ['Client', 'Status', 'Contracted', 'Delivered', 'Reels delivered / contracted', 'Posts delivered / contracted', 'Carousels delivered / contracted', 'Stories delivered / contracted', 'Pace summary']
      rows = sow.map((row) => [row.client_name, row.status.replaceAll('_', ' '), row.contracted, row.delivered,
        `${row.byType.reel.delivered}/${row.byType.reel.contracted}`, `${row.byType.post.delivered}/${row.byType.post.contracted}`,
        `${row.byType.carousel.delivered}/${row.byType.carousel.contracted}`, `${row.byType.story.delivered}/${row.byType.story.contracted}`, row.summary])
      name = `scope-of-work-${month}`
    } else if (view === 'team') {
      if (!isAdmin) return forbidden()
      const { groups } = await teamAnalytics(user, month, {}, true)
      header = ['Role', 'Member', 'Assigned clients', 'Throughput', 'Revisions per item', 'Median turnaround', 'On-time rate']
      rows = groups.flatMap((group) => group.members.map((member) => [group.label.replace(/s$/, ''), member.name, member.clients.map((c) => c.name).join('; '),
        member.throughput, member.role === 'editor' || member.role === 'brand_manager' ? member.revision_rate : '', member.role === 'editor' || member.role === 'brand_manager' ? hoursLabel(member.median_turnaround_hours) : '',
        member.role === 'brand_manager' && member.on_time_samples ? `${member.on_time_rate}%` : '']))
      name = `team-${month}`
    } else if (view === 'posting') {
      const data = await postingData(user, month)
      header = ['Client', 'Idea', 'Format', 'Scheduled (IST)', 'State', 'Posted (IST)', 'Caption', 'Music']
      rows = data.posts.map((post) => [post.client_name, post.title, post.type, istDateTime(post.scheduled_at), post.posted_at ? 'Posted' : Date.parse(post.scheduled_at) < Date.now() ? 'Overdue' : 'Upcoming',
        post.posted_at ? istDateTime(post.posted_at) : '', post.caption, post.bg_music_ref ?? ''])
      name = `posting-${month}`
    } else if (view === 'cards') {
      const card = params.get('card') as keyof Cards | null
      if (!card || !CARDS.includes(card)) return badRequest('Unknown card')
      const list = (await dashboardCards(user))[card]
      header = [card === 'activeClients' ? 'Client' : 'Idea', card === 'activeClients' ? 'Niche' : 'Client', 'Detail']
      rows = list.map((row) => [row.title, row.client, row.detail])
      name = `${fileSlug(card)}`
    } else return badRequest('Unknown view')
  } catch { return NextResponse.json({ message: 'Could not prepare the export' }, { status: 500 }) }

  await supabaseAdmin.from('activity_log').insert({ id: randomUUID(), agency_id: user.agency_id, actor_id: user.id, actor_type: 'user', entity_type: 'export',
    entity_id: view, action: 'exported', metadata: { view, month, rows: rows.length, card: params.get('card') } })
  return new NextResponse(toCsv(header, rows), { headers: {
    'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${fileSlug(name)}.csv"`, 'Cache-Control': 'no-store' } })
}
