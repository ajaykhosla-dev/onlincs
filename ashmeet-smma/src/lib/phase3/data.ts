import 'server-only'
import { canAccess } from '@/lib/auth/can-access'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Client, ClientScope, ContentItem, MonthlyPlan, User } from '@/types/database'

export function monthBounds(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Invalid month')
  const [year, index] = month.split('-').map(Number)
  return { start: `${month}-01`, end: new Date(Date.UTC(year, index, 1)).toISOString().slice(0, 10) }
}

export function clientResource(client: Client) {
  return { type: 'client' as const, agency_id: client.agency_id, manager_id: client.manager_id, assigned_editor_ids: [] }
}

export async function accessibleClients(user: User): Promise<Client[]> {
  const { data, error } = await supabaseAdmin.from('clients').select('*').eq('agency_id', user.agency_id).order('name')
  if (error) throw error
  return ((data ?? []) as Client[]).filter((client) => canAccess(user, clientResource(client), 'read'))
}

export async function getClientFor(user: User, id: string, action: 'read' | 'write'): Promise<Client | null> {
  const { data, error } = await supabaseAdmin.from('clients').select('*').eq('id', id).eq('agency_id', user.agency_id).maybeSingle()
  if (error) throw error
  const client = data as Client | null
  return client && canAccess(user, clientResource(client), action) ? client : null
}

export async function clientDashboard(user: User, month: string) {
  const { start, end } = monthBounds(month)
  const clients = await accessibleClients(user)
  const ids = clients.map((c) => c.id)
  if (!ids.length) return { clients: [], managers: [] }
  const [scope, items, managers] = await Promise.all([
    supabaseAdmin.from('client_scope').select('*').in('client_id', ids).eq('month', start),
    supabaseAdmin.from('content_items').select('client_id').in('client_id', ids).eq('status', 'posted').gte('planned_date', start).lt('planned_date', end),
    supabaseAdmin.from('users').select('id,full_name').eq('agency_id', user.agency_id).eq('role', 'brand_manager').eq('is_active', true),
  ])
  if (scope.error || items.error || managers.error) throw scope.error ?? items.error ?? managers.error
  const scopeByClient = new Map(((scope.data ?? []) as ClientScope[]).map((s) => [s.client_id, s]))
  return {
    clients: clients.map((client) => {
      const s = scopeByClient.get(client.id)
      return { ...client, scope: s ?? null, delivered: (items.data ?? []).filter((item) => item.client_id === client.id).length }
    }),
    managers: managers.data ?? [],
  }
}

export async function plannerData(user: User, clientId: string, month: string) {
  const client = await getClientFor(user, clientId, 'read')
  if (!client) return null
  const { start, end } = monthBounds(month)
  const [items, plan] = await Promise.all([
    supabaseAdmin.from('content_items').select('*').eq('client_id', clientId).gte('planned_date', start).lt('planned_date', end).neq('status', 'archived').order('planned_date').order('planned_time'),
    supabaseAdmin.from('monthly_plans').select('*').eq('client_id', clientId).eq('month', start).maybeSingle(),
  ])
  if (items.error || plan.error) throw items.error ?? plan.error
  return { client, items: (items.data ?? []) as ContentItem[], plan: plan.data as MonthlyPlan | null }
}
