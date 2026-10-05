import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { getCurrentUser } from '@/lib/auth/current-user'
import { forbidden, unauthorized } from '@/lib/api'
import { headObject, presignDownload } from '@/lib/b2/presign'
import { postAccess } from '@/lib/phase7/access'
import { cutFilename } from '@/lib/phase7/format'
import { supabaseAdmin } from '@/lib/supabase/admin'

type Context = { params: Promise<{ id: string }> }

/** Short-lived download link for the latest client-approved cut, saved under a readable filename. Every call is logged. */
export async function GET(_request: Request, { params }: Context) {
  const user = await getCurrentUser()
  if (!user) return unauthorized()
  const { id } = await params
  const access = await postAccess(user, id, 'read')
  if (!access) return forbidden()
  const { data: version } = await supabaseAdmin.from('deliverable_versions').select('id,version,b2_key')
    .eq('content_item_id', access.item.id).eq('status', 'client_approved').order('version', { ascending: false }).limit(1).maybeSingle()
  if (!version) return NextResponse.json({ message: 'There is no client-approved cut to download for this item.' }, { status: 404 })
  try { await headObject(version.b2_key) }
  catch { return NextResponse.json({ message: 'The cut file is not available in storage right now.' }, { status: 404 }) }
  const filename = cutFilename(access.clientName, access.item.title, version.version)
  const url = await presignDownload(version.b2_key, filename, 5 * 60)
  await supabaseAdmin.from('activity_log').insert({ id: randomUUID(), agency_id: access.item.agency_id, actor_id: user.id, actor_type: 'user',
    entity_type: 'content_item', entity_id: access.item.id, action: 'cut_downloaded',
    metadata: { post_id: id, version_id: version.id, version: version.version, filename } })
  return NextResponse.json({ url, filename, version: version.version, expiresIn: 300 }, { headers: { 'Cache-Control': 'no-store' } })
}
