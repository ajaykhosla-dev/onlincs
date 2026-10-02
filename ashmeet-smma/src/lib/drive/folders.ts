import { google } from 'googleapis'
import { env } from '@/lib/env'

// Parse service account key from env
const saKey = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_KEY)

const auth = new google.auth.GoogleAuth({
  credentials: saKey,
  scopes: ['https://www.googleapis.com/auth/drive'],
})

export const drive = google.drive({ version: 'v3', auth })

/**
 * Find or create a folder in the Shared Drive.
 */
export async function ensureFolder(name: string, parentId: string | null): Promise<string> {
  const driveApi = drive

  // Search for existing folder
  const res = await driveApi.files.list({
    q: `name='${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    corpora: 'drive',
    driveId: env.GOOGLE_SHARED_DRIVE_ID,
  })

  const existing = res.data.files?.[0]
  if (existing?.id) return existing.id

  // Create folder
  const created = await driveApi.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : [env.GOOGLE_SHARED_DRIVE_ID],
    },
    fields: 'id',
    supportsAllDrives: true,
  })

  const newId = created.data.id
  if (!newId) throw new Error(`Failed to create Drive folder: ${name}`)
  return newId
}

/**
 * Provision a folder structure: Client / YYYY-MM / YYYY-MM-DD Shoot Title / idea-slug
 */
export async function provisionShootFolder(params: {
  clientName: string
  month: string       // "2026-09"
  shootTitle: string  // "2026-09-22 Test Shoot"
  ideaSlug: string
}): Promise<{ folderId: string; folderLink: string }> {
  const clientFolder = await ensureFolder(params.clientName, null)
  const monthFolder = await ensureFolder(params.month, clientFolder)
  const shootFolder = await ensureFolder(params.shootTitle, monthFolder)
  const ideaFolder = await ensureFolder(params.ideaSlug, shootFolder)

  return {
    folderId: ideaFolder,
    folderLink: `https://drive.google.com/drive/folders/${ideaFolder}`,
  }
}
