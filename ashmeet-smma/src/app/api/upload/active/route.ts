import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { forbidden, unauthorized } from '@/lib/api'
import { supabaseAdmin } from '@/lib/supabase/admin'

/** Resume listing deliberately omits the encrypted and decrypted session URI. */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  if (!['cameraman','admin'].includes(user.role)) return forbidden()
  const { data, error } = await supabaseAdmin.from('upload_sessions')
    .select('id,shoot_id,content_item_id,file_name,file_size_bytes,bytes_received,expires_at,status,created_at')
    .eq('agency_id', user.agency_id).eq('started_by', user.id).eq('status', 'active')
    .order('created_at', { ascending: false }).limit(100)
  if (error) return NextResponse.json({ message: 'Could not load uploads' }, { status: 500 })
  const now = Date.now()
  const expired = (data ?? []).filter((s) => new Date(s.expires_at).getTime() < now)
  if (expired.length) await supabaseAdmin.from('upload_sessions').update({ status: 'expired' }).in('id', expired.map((s) => s.id))
  return NextResponse.json({ sessions: (data ?? []).map((s) => ({ ...s, status: new Date(s.expires_at).getTime() < now ? 'expired' : 'active' })) })
}
