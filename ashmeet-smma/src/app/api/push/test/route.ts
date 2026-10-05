import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { unauthorized } from '@/lib/api'
import { sendToUser } from '@/lib/push/send'

/** Sends a test push to every device of the signed-in user, ignoring category and quiet-hour settings. */
export async function POST() {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  const result = await sendToUser(user.id, { title: 'Test notification', body: 'Push is working on this device.', link: '/account/notifications', tag: 'test' })
    .catch(() => null)
  if (!result) return NextResponse.json({ message: 'Push could not be sent right now.' }, { status: 502 })
  if (!result.sent) return NextResponse.json({ message: result.pruned ? 'That device has expired. Turn notifications on again.' : 'No device is subscribed yet.', ...result }, { status: 409 })
  return NextResponse.json(result)
}
