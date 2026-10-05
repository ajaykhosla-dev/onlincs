import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { forbidden, unauthorized } from '@/lib/api'
import { RetryExhaustedError } from '@/lib/retry'
import { driveReportedBytes } from '@/lib/storage/delete'
import { storageOverview } from '@/lib/storage/usage'

export const maxDuration = 60

/** Compares what the app has recorded with the file sizes Google Drive reports for the Shared Drive. */
export async function POST() {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  if (user.role !== 'admin' && user.role !== 'platform_owner') return forbidden()
  try {
    const [overview, reported] = await Promise.all([storageOverview(user), driveReportedBytes(user.agency_id)])
    const difference = reported - overview.used
    return NextResponse.json({ recorded: overview.used, reported, difference, percentDifference: reported ? Math.round((Math.abs(difference) / reported) * 1000) / 10 : 0 })
  } catch (error) {
    return NextResponse.json({ message: error instanceof RetryExhaustedError ? error.message : 'Could not read Drive usage right now.' }, { status: 502 })
  }
}
