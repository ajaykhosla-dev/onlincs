import { redirect } from 'next/navigation'
import { MfaForm } from '@/components/platform/MfaForm'
import { assuranceLevel, requirePlatformOwner } from '@/lib/platform/auth'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function PlatformMfaPage() {
  await requirePlatformOwner({ requireMfa: false })
  if ((await assuranceLevel()).current === 'aal2') redirect('/platform')
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.mfa.listFactors()
  const verified = data?.totp?.find((factor) => factor.status === 'verified')
  return <MfaForm enrolledFactorId={verified?.id ?? null} />
}
