import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/current-user'
import { badRequest, forbidden, parseJsonBody, unauthorized } from '@/lib/api'
import { confirmationPhrase, MAX_DELETE_PER_REQUEST } from '@/lib/storage/constants'
import { deleteShootRaw } from '@/lib/storage/delete'

export const maxDuration = 60
const schema = z.object({ shootIds: z.array(z.string().min(1)).min(1).max(MAX_DELETE_PER_REQUEST, `Select at most ${MAX_DELETE_PER_REQUEST} shoots at a time`), confirm: z.string() })

/**
 * Admin only. The caller must type the exact phrase naming how many shoots are being deleted, there is no
 * "delete everything" option, and every shoot is re-checked for eligibility on the server.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  if (user.role !== 'admin' && user.role !== 'platform_owner') return forbidden()
  const parsed = await parseJsonBody(request, schema)
  if (!parsed.ok) return parsed.response
  const ids = [...new Set(parsed.value.shootIds)]
  if (parsed.value.confirm.trim().toLowerCase() !== confirmationPhrase(ids.length)) return badRequest(`Type exactly "${confirmationPhrase(ids.length)}" to confirm.`)
  const results = []
  for (const id of ids) results.push(await deleteShootRaw(user, id))
  const freed = results.reduce((total, result) => total + (result.ok ? result.freed : 0), 0)
  return NextResponse.json({ results, freed }, { status: results.every((result) => !result.ok) ? 409 : 200 })
}
