import 'server-only'
import type { DriveContext } from '@/lib/integrations/credentials'
import { withRetry } from '@/lib/retry'

const FOLDER = 'application/vnd.google-apps.folder'
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

/** Find or create a folder under `parentId` (the Shared Drive root when null). */
export async function ensureFolder(ctx: DriveContext, name: string, parentId: string | null): Promise<string> {
  const { drive } = ctx
  const parent = parentId ?? ctx.driveId
  const found = await withRetry(() => drive.files.list({
    q: `name='${esc(name)}' and '${parent}' in parents and mimeType='${FOLDER}' and trashed=false`,
    fields: 'files(id)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    corpora: 'drive',
    driveId: ctx.driveId,
  }), { service: 'Google Drive' })
  const existing = found.data.files?.[0]?.id
  if (existing) return existing

  const created = await withRetry(() => drive.files.create({
    requestBody: { name, mimeType: FOLDER, parents: [parent] },
    fields: 'id',
    supportsAllDrives: true,
  }), { service: 'Google Drive' })
  if (!created.data.id) throw new Error(`Failed to create Drive folder: ${name}`)
  return created.data.id
}

export const folderLink = (id: string) => `https://drive.google.com/drive/folders/${id}`

/**
 * Provision `Client / YYYY-MM / YYYY-MM-DD Shoot Title / idea-slug`.
 * Returns every level so callers can persist the shoot folder and the per-idea subfolder.
 */
export async function provisionShootFolder(ctx: DriveContext, params: {
  clientName: string
  month: string // "2026-09"
  shootTitle: string // "2026-09-22 Ramana Dental"
  ideaSlug: string
}) {
  const client = await ensureFolder(ctx, params.clientName, null)
  const month = await ensureFolder(ctx, params.month, client)
  const shoot = await ensureFolder(ctx, params.shootTitle, month)
  const idea = await ensureFolder(ctx, params.ideaSlug, shoot)
  return {
    clientFolderId: client,
    shootFolderId: shoot,
    shootFolderLink: folderLink(shoot),
    ideaFolderId: idea,
    ideaFolderLink: folderLink(idea),
  }
}
