import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { unauthorized } from '@/lib/api'
import { supabaseAdmin } from '@/lib/supabase/admin'

/** The bell: the signed-in person's recent notifications (newest first) and their true unread count. */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  const [items, unread] = await Promise.all([
    supabaseAdmin.from('notifications').select('id,type,title,body,link,read_at,created_at,batch_count').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(40),
    supabaseAdmin.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('read_at', null),
  ])
  if (items.error || unread.error) return NextResponse.json({ message: 'Could not load notifications' }, { status: 500 })
  return NextResponse.json({ items: items.data ?? [], unread: unread.count ?? 0 }, { headers: { 'Cache-Control': 'no-store' } })
}
