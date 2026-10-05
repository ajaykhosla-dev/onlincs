import 'server-only'
import webpush from 'web-push'
import { after } from 'next/server'
import { env } from '@/lib/env'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { normalizePrefs, pushDecision } from './prefs'

export type PushPayload = { title: string; body?: string | null; link?: string | null; tag?: string; id?: string }

let configured = false
function configure() {
  if (configured) return
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY)
  configured = true
}

/** Sends to every device the user has subscribed. A 404/410 means the device is gone, so its row is deleted. */
export async function sendToUser(userId: string, payload: PushPayload): Promise<{ sent: number; pruned: number; failed: number }> {
  configure()
  const { data: subscriptions } = await supabaseAdmin.from('push_subscriptions').select('id,endpoint,p256dh,auth').eq('user_id', userId)
  const result = { sent: 0, pruned: 0, failed: 0 }
  await Promise.all((subscriptions ?? []).map(async (subscription) => {
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
        JSON.stringify(payload), { TTL: 3600, urgency: 'normal' })
      result.sent++
      await supabaseAdmin.from('push_subscriptions').update({ last_used_at: new Date().toISOString() }).eq('id', subscription.id)
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) {
        await supabaseAdmin.from('push_subscriptions').delete().eq('id', subscription.id)
        result.pruned++
      } else result.failed++
    }
  }))
  return result
}

/**
 * Delivers notifications that have not been pushed yet. Each row is claimed first (pushed_at set where it is
 * still null) so two overlapping runs never double-send. Preferences only suppress push; the row already exists.
 */
export async function flushPush(limit = 200) {
  const since = new Date(Date.now() - 24 * 3600e3).toISOString()
  const { data: pending } = await supabaseAdmin.from('notifications').select('id,user_id,type,title,body,link')
    .is('pushed_at', null).gte('created_at', since).order('created_at').limit(limit)
  if (!pending?.length) return { processed: 0, sent: 0 }
  const userIds = [...new Set(pending.map((row) => row.user_id))]
  const { data: prefRows } = await supabaseAdmin.from('notification_prefs').select('user_id,categories,quiet_enabled,quiet_start,quiet_end').in('user_id', userIds)
  const prefs = new Map((prefRows ?? []).map((row) => [row.user_id, normalizePrefs(row)]))
  let sent = 0
  for (const row of pending) {
    const { data: claimed } = await supabaseAdmin.from('notifications').update({ pushed_at: new Date().toISOString(), push_state: 'sending' })
      .eq('id', row.id).is('pushed_at', null).select('id').maybeSingle()
    if (!claimed) continue
    const decision = pushDecision(row.type, prefs.get(row.user_id) ?? normalizePrefs(null))
    let state: string = decision
    if (decision === 'send') {
      const outcome = await sendToUser(row.user_id, { title: row.title, body: row.body, link: row.link, tag: row.type, id: row.id }).catch(() => null)
      state = !outcome ? 'failed' : outcome.sent ? 'sent' : outcome.failed ? 'failed' : 'no_subscription'
      if (outcome?.sent) sent++
    }
    await supabaseAdmin.from('notifications').update({ push_state: state }).eq('id', row.id)
  }
  return { processed: pending.length, sent }
}

/** Call after a route or page has caused a notification: delivery runs once the response has been sent. */
export function pushAfterResponse() {
  try { after(async () => { await flushPush().catch(() => {}) }) }
  catch { void flushPush().catch(() => {}) }
}
