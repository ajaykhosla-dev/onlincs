import 'server-only'
import { env } from '@/lib/env'
import { drive } from '@/lib/drive/auth'

const FOLDER = 'application/vnd.google-apps.folder'
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

/** Find or create a folder under `parentId` (the Shared Drive root when null). */
export async function ensureFolder(name: string, parentId: string | null): Promise<string> {
  const parent = parentId ?? env.GOOGLE_SHARED_DRIVE_ID
  const found = await drive.files.list({
    q: `name='${esc(name)}' and '${parent}' in parents and mimeType='${FOLDER}' and trashed=false`,
    fields: 'files(id)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    corpora: 'drive',
    driveId: env.GOOGLE_SHARED_DRIVE_ID,
  })
  const existing = found.data.files?.[0]?.id
  if (existing) return existing

  const created = await drive.files.create({
    requestBody: { name, mimeType: FOLDER, parents: [parent] },
    fields: 'id',
    supportsAllDrives: true,
  })
  if (!created.data.id) throw new Error(`Failed to create Drive folder: ${name}`)
  return created.data.id
}

export const folderLink = (id: string) => `https://drive.google.com/drive/folders/${id}`

/**
 * Provision `Client / YYYY-MM / YYYY-MM-DD Shoot Title / idea-slug`.
 * Returns every level so callers can persist the shoot folder and the per-idea subfolder.
 */
export async function provisionShootFolder(params: {
  clientName: string
  month: string // "2026-09"
  shootTitle: string // "2026-09-22 Ramana Dental"
  ideaSlug: string
}) {
  const client = await ensureFolder(params.clientName, null)
  const month = await ensureFolder(params.month, client)
  const shoot = await ensureFolder(params.shootTitle, month)
  const idea = await ensureFolder(params.ideaSlug, shoot)
  return {
    clientFolderId: client,
    shootFolderId: shoot,
    shootFolderLink: folderLink(shoot),
    ideaFolderId: idea,
    ideaFolderLink: folderLink(idea),
  }
}
