import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { forbidden, unauthorized } from '@/lib/api'
import { dashboardCards } from '@/lib/analytics/cards'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  if (!['admin', 'brand_manager', 'platform_owner'].includes(user.role)) return forbidden()
  try { return NextResponse.json(await dashboardCards(user), { headers: { 'Cache-Control': 'no-store' } }) }
  catch { return NextResponse.json({ message: 'Could not load the dashboard numbers' }, { status: 500 }) }
}
