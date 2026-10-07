import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth/current-user'
import { forbidden, parseJsonBody, unauthorized } from '@/lib/api'
import { supabaseAdmin } from '@/lib/supabase/admin'

const inviteSchema = z.object({
  email: z.email().trim().toLowerCase(),
  full_name: z.string().trim().min(2).max(120),
  role: z.enum(['admin', 'brand_manager', 'editor', 'cameraman']),
})
const gradients = ['linear-gradient(140deg,#8F80F7,#5A4AD8)', 'linear-gradient(140deg,#F8A0BC,#DF5A86)',
  'linear-gradient(140deg,#63DCA9,#1FA772)', 'linear-gradient(140deg,#62A0F2,#14539F)']
const initialsOf = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('')

/**
 * Admin invites a team member. Sign-in is Google only: this creates the workspace row, and the database links the
 * person's Google identity to it by email the first time they sign in.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  if (user.role !== 'admin') return forbidden()
  const body = await parseJsonBody(request, inviteSchema)
  if (!body.ok) return body.response
  const { email, full_name, role } = body.value
  // Sign-in only admits an email that belongs to exactly one active workspace member, so never create a second.
  // ilike treats _ and % as wildcards, so it only narrows the search; the exact comparison happens here.
  const { data: candidates } = await supabaseAdmin.from('users').select('agency_id,email').ilike('email', email).eq('is_active', true)
  const existing = (candidates ?? []).filter((u) => u.email.toLowerCase() === email)
  if (existing.length) return NextResponse.json({ message: existing.some((u) => u.agency_id === user.agency_id)
    ? 'This person is already on your team.' : 'This email already belongs to another workspace.' }, { status: 409 })
  const id = randomUUID()
  const { error } = await supabaseAdmin.from('users').insert({ id, agency_id: user.agency_id, email, full_name, initials: initialsOf(full_name),
    role, avatar_gradient: gradients[Math.floor(Math.random() * gradients.length)], is_active: true })
  if (error) return NextResponse.json({ message: error.code === '23505' ? 'This person is already on your team.' : 'Could not add this team member.' },
    { status: error.code === '23505' ? 409 : 500 })
  await supabaseAdmin.from('activity_log').insert({ id: randomUUID(), agency_id: user.agency_id, actor_id: user.id, actor_type: 'user',
    entity_type: 'user', entity_id: id, action: 'invited', metadata: { email, role } })
  return NextResponse.json({ id }, { status: 201 })
}
