import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { forbidden, unauthorized } from '@/lib/api'
import { hasFaststart, headObject, presignGet } from '@/lib/b2/presign'
import { accessibleLibraryClients } from '@/lib/phase5/data'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  const params = new URL(request.url).searchParams
  const versionId = params.get('versionId')
  const assetId = params.get('assetId')
  if (!!versionId === !!assetId) return NextResponse.json({ message: 'Choose one media item' },{ status: 400 })
  let key: string | undefined
  if (versionId) {
    const { data: version } = await supabaseAdmin.from('deliverable_versions').select('agency_id,content_item_id,b2_key').eq('id',versionId).maybeSingle()
    if (!version || version.agency_id !== user.agency_id) return forbidden()
    const { data: item } = await supabaseAdmin.from('content_items').select('client_id,assigned_editor_id').eq('id',version.content_item_id).maybeSingle()
    if (!item) return forbidden()
    if (user.role === 'editor' && item.assigned_editor_id !== user.id) return forbidden()
    if (user.role === 'brand_manager') {
      const { data: client } = await supabaseAdmin.from('clients').select('manager_id').eq('id',item.client_id).maybeSingle()
      if (client?.manager_id !== user.id) return forbidden()
    } else if (!['admin','editor'].includes(user.role)) return forbidden()
    key = version.b2_key
  } else {
    const { data: asset } = await supabaseAdmin.from('library_assets').select('agency_id,client_id,b2_key').eq('id',assetId!).maybeSingle()
    if (!asset || asset.agency_id !== user.agency_id) return forbidden()
    if (!(await accessibleLibraryClients(user)).some((client) => client.id === asset.client_id)) return forbidden()
    key = asset.b2_key
  }
  if (!key) return forbidden()
  try {
    await headObject(key)
    const url = await presignGet(key,5*60)
    const faststart = versionId ? await hasFaststart(key).catch(() => null) : null
    return NextResponse.json({ url, expiresIn: 300, faststart },{ headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const missing = error instanceof Error && ['NotFound','NoSuchKey'].includes(error.name)
    return NextResponse.json({ message: missing ? 'This media file is not present in B2 yet. Seeded sample links are placeholders.' : 'Could not open media right now.' },
      { status: missing ? 404 : 502 })
  }
}
