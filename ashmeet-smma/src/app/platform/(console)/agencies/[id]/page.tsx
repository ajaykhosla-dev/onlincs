import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AgencyDetail } from '@/components/platform/AgencyDetail'
import { agencyUsage, getAgency } from '@/lib/platform/agencies'
import { integrationSummary } from '@/lib/platform/integrations'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function AgencyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const agency = await getAgency(id)
  if (!agency) notFound()
  const [usage, integrations, trail] = await Promise.all([
    agencyUsage(id), integrationSummary(id),
    supabaseAdmin.from('activity_log').select('id,action,created_at,metadata').eq('agency_id', id).eq('entity_type', 'platform').order('created_at', { ascending: false }).limit(15),
  ])
  return <>
    <p><Link href="/platform" className="p-muted">← All agencies</Link></p>
    <AgencyDetail agency={agency} usage={usage} integrations={integrations} trail={trail.data ?? []} />
  </>
}
