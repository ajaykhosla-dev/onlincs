import { supabaseAdmin } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const anyAdmin = supabaseAdmin as any

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function ApprovePage({ params }: PageProps) {
  const { token } = await params

  // Look up the approval link by token hash
  const { data: approval } = await anyAdmin
    .from('approval_links')
    .select('*, content_items(title, type, clients(name))')
    .eq('token_hash', `hash-${token}`)
    .is('revoked_at', null)
    .is('responded_at', null)
    .single()

  if (!approval) return notFound()

  const isExpired = new Date(approval.expires_at) < new Date()

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-4">Client Approval</h1>
      {isExpired ? (
        <p className="text-gray-400">This approval link has expired.</p>
      ) : (
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <p className="text-sm text-gray-500 mb-2">Content: {(approval as any).content_items?.title}</p>
          <p className="text-sm text-gray-500 mb-4">Client: {(approval as any).content_items?.clients?.name}</p>
          <p className="text-sm text-gray-400">Approval form will be rendered here in Phase 6.</p>
        </div>
      )}
    </div>
  )
}
