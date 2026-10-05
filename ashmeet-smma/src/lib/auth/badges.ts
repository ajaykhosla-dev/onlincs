import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { User } from '@/types/database'

export type NavBadges = { den?: number; todo?: number; redo?: number; pending?: number }

/** Live counts for the rail badges, scoped to what this person can see. A failure shows no badge rather than a wrong one. */
export async function navBadges(user: User): Promise<NavBadges> {
  try {
    if (user.role === 'admin' || user.role === 'brand_manager') {
      let query = supabaseAdmin.from('content_items').select('id,client_id', { count: 'exact' }).eq('agency_id', user.agency_id).eq('status', 'cut_submitted')
      if (user.role === 'brand_manager') {
        const { data: clients } = await supabaseAdmin.from('clients').select('id').eq('manager_id', user.id)
        const ids = (clients ?? []).map((client) => client.id)
        if (!ids.length) return { den: 0 }
        query = query.in('client_id', ids)
      }
      const { count } = await query
      return { den: count ?? 0 }
    }
    if (user.role === 'editor') {
      const { data: items } = await supabaseAdmin.from('content_items').select('id,status').eq('agency_id', user.agency_id).eq('assigned_editor_id', user.id)
        .in('status', ['with_editor', 'changes_requested', 'client_changes'])
      const ids = (items ?? []).map((item) => item.id)
      const { data: versions } = ids.length ? await supabaseAdmin.from('deliverable_versions').select('content_item_id').in('content_item_id', ids) : { data: [] }
      const versioned = new Set((versions ?? []).map((version) => version.content_item_id))
      const redo = (items ?? []).filter((item) => item.status !== 'with_editor' || versioned.has(item.id)).length
      return { todo: (items ?? []).length - redo, redo }
    }
    if (user.role === 'cameraman') {
      const { count } = await supabaseAdmin.from('shoots').select('id', { count: 'exact', head: true }).eq('agency_id', user.agency_id)
        .eq('cameraman_id', user.id).in('status', ['scheduled', 'completed']).lt('scheduled_end', new Date().toISOString())
      return { pending: count ?? 0 }
    }
  } catch { /* no badge */ }
  return {}
}
