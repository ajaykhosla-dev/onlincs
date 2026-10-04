import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { forbidden, unauthorized } from '@/lib/api'
import { accessibleClients } from '@/lib/phase3/data'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  if (!['admin','brand_manager'].includes(user.role)) return forbidden()
  try {
    const clients = await accessibleClients(user)
    const [cameras, items] = await Promise.all([
      supabaseAdmin.from('users').select('id,full_name').eq('agency_id',user.agency_id).eq('role','cameraman').eq('is_active',true),
      supabaseAdmin.from('content_items').select('id,client_id,title,status').eq('agency_id',user.agency_id).in('status',['calendar_approved','shoot_scheduled']),
    ])
    if (cameras.error || items.error) throw cameras.error ?? items.error
    const ids = new Set(clients.map((c) => c.id))
    return NextResponse.json({ clients: clients.map((c) => ({ id:c.id,name:c.name })), cameramen:cameras.data,
      items:(items.data ?? []).filter((item) => ids.has(item.client_id)) })
  } catch { return NextResponse.json({ message:'Could not load shoot options' }, { status:500 }) }
}
