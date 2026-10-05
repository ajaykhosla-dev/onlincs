import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { forbidden, unauthorized } from '@/lib/api'
import { storageOverview } from '@/lib/storage/usage'

/** Admins and brand managers can see storage (a manager only their own clients' breakdown); only admins can delete. */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  if (!['admin', 'brand_manager', 'platform_owner'].includes(user.role)) return forbidden()
  try { return NextResponse.json({ ...(await storageOverview(user)), canDelete: user.role === 'admin' || user.role === 'platform_owner' }, { headers: { 'Cache-Control': 'no-store' } }) }
  catch { return NextResponse.json({ message: 'Could not load storage usage' }, { status: 500 }) }
}
