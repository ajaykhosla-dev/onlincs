import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/admin'

export type AgencyBrand = { name: string; logo_url: string | null }

/** The agency's display name and logo, shown only inside that agency's own screens. */
export async function agencyBrand(agencyId: string): Promise<AgencyBrand | undefined> {
  const { data } = await supabaseAdmin.from('agencies').select('name,display_name,logo_url').eq('id', agencyId).maybeSingle()
  return data ? { name: data.display_name || data.name, logo_url: data.logo_url } : undefined
}
