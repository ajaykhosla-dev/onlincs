import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { getCurrentUser } from '@/lib/auth/current-user'
import { badRequest, forbidden, unauthorized } from '@/lib/api'
import { loadInputs, sowAnalytics } from '@/lib/analytics'
import { computeMetrics, median } from '@/lib/analytics/compute'
import { hoursLabel } from '@/lib/analytics/format'
import { fileSlug, sectionsCsv } from '@/lib/export/csv'
import { getClientFor, monthBounds } from '@/lib/phase3/data'
import { monthSchema } from '@/lib/phase3/schemas'
import { istDateTime } from '@/lib/phase7/format'
import { supabaseAdmin } from '@/lib/supabase/admin'

/** The monthly report Ashmeet can send a client: scope, delivered, turnaround and revisions, in one Excel-friendly CSV. */
export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  if (!['admin', 'brand_manager', 'platform_owner'].includes(user.role)) return forbidden()
  const params = new URL(request.url).searchParams
  const clientId = params.get('clientId') ?? ''
  const month = params.get('month') ?? new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).slice(0, 7)
  if (!clientId || !monthSchema.safeParse(month).success) return badRequest('Choose a client and month')
  const client = await getClientFor(user, clientId, 'read')
  if (!client) return forbidden()

  try {
    const { start, end } = monthBounds(month)
    const [{ rows }, input, titles, posts] = await Promise.all([
      sowAnalytics(user, month, true), loadInputs(user.agency_id),
      supabaseAdmin.from('content_items').select('id,title,type,status,planned_date').eq('client_id', clientId).gte('planned_date', start).lt('planned_date', end).order('planned_date'),
      supabaseAdmin.from('post_schedule').select('content_item_id,scheduled_at,posted_at').eq('agency_id', user.agency_id),
    ])
    const sow = rows.find((row) => row.client_id === clientId)
    if (!sow || titles.error || posts.error) throw new Error('missing data')
    const { agency, samples } = computeMetrics(input, { month, clientId })
    const revisions = (id: string) => input.events.filter((event) => event.entity_id === id && ['changes_requested', 'client_changes'].includes(event.to_state)).length
    const postedAt = new Map((posts.data ?? []).map((post) => [post.content_item_id, post.posted_at]))
    const items = titles.data ?? []
    const csv = sectionsCsv([
      { title: `Monthly report: ${client.name}`, rows: [['Month', month], ['Generated', istDateTime(new Date())], ['Agency', 'Ashmeet SMMA']] },
      { title: 'Scope of work', header: ['Type', 'Contracted', 'Delivered'], rows: [
        ['Reels', sow.byType.reel.contracted, sow.byType.reel.delivered], ['Posts', sow.byType.post.contracted, sow.byType.post.delivered],
        ['Carousels', sow.byType.carousel.contracted, sow.byType.carousel.delivered], ['Stories', sow.byType.story.contracted, sow.byType.story.delivered],
        ['Total', sow.contracted, sow.delivered]] },
      { title: 'Turnaround (median)', header: ['Step', 'Median', 'Cases'], rows: [
        ['Raw footage to first cut', hoursLabel(agency.median_turnaround_hours), agency.turnaround_samples],
        ['Cut submitted to internally approved', hoursLabel(Math.round(median(samples.managerTurn.map((s) => s.hours)) * 10) / 10), samples.managerTurn.length],
        ['Sent to client to client approved', hoursLabel(agency.clients_turnaround_hours), samples.clientTurn.length]] },
      { title: 'Revisions', header: ['Measure', 'Value'], rows: [['Average revisions per delivered item', agency.revision_rate],
        ['Items approved first time', `${agency.first_pass_rate}% of ${agency.first_pass_samples}`]] },
      { title: 'Content this month', header: ['Idea', 'Format', 'Planned date', 'Status', 'Revisions', 'Posted (IST)'],
        rows: items.map((item) => [item.title, item.type, item.planned_date, item.status.replaceAll('_', ' '), revisions(item.id), postedAt.get(item.id) ? istDateTime(postedAt.get(item.id)!) : '']) },
    ])
    await supabaseAdmin.from('activity_log').insert({ id: randomUUID(), agency_id: user.agency_id, actor_id: user.id, actor_type: 'user', entity_type: 'export',
      entity_id: clientId, action: 'exported', metadata: { view: 'client_report', month, rows: items.length } })
    return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileSlug(client.name)}-report-${month}.csv"`, 'Cache-Control': 'no-store' } })
  } catch { return NextResponse.json({ message: 'Could not prepare the report' }, { status: 500 }) }
}
