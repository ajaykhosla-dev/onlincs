import { google } from 'googleapis'
import { env } from '@/lib/env'
import { supabaseAdmin } from '@/lib/supabase/admin'

const saKey = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_KEY)
const auth = new google.auth.GoogleAuth({
  credentials: saKey,
  scopes: ['https://www.googleapis.com/auth/drive'],
})

const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable'

export async function createUploadSession(params: {
  shootId: string
  contentItemId: string
  fileName: string
  fileSizeBytes: number
  mimeType: string
  folderId: string
  userId: string
}): Promise<{ sessionUri: string; sessionId: string }> {
  const accessTokenResult = await auth.getAccessToken()
  const token = typeof accessTokenResult === 'string' ? accessTokenResult : (accessTokenResult as { token?: string } | null)?.token
  if (!token) throw new Error('Failed to get access token from service account')

  const res = await fetch(DRIVE_UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
      'X-Upload-Content-Type': params.mimeType,
      'X-Upload-Content-Length': String(params.fileSizeBytes),
    },
    body: JSON.stringify({
      name: params.fileName,
      parents: [params.folderId],
      mimeType: params.mimeType,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Drive resumable session failed: ${res.status} ${text}`)
  }

  const sessionUri = res.headers.get('Location')
  if (!sessionUri) throw new Error('Drive did not return a resumable session URI')

  const encryptedUri = Buffer.from(sessionUri).toString('base64')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabaseAdmin
    .from('upload_sessions')
    .insert({
      agency_id: 'ag-1',
      shoot_id: params.shootId,
      content_item_id: params.contentItemId,
      file_name: params.fileName,
      file_size_bytes: params.fileSizeBytes,
      mime_type: params.mimeType,
      session_uri_enc: encryptedUri,
      bytes_received: 0,
      status: 'active',
      expires_at: expiresAt,
      started_by: params.userId,
    })
    .select('id')
    .single()

  if (error) throw error
  return { sessionUri, sessionId: data.id }
}

export async function queryProgress(sessionUri: string, totalBytes: number): Promise<number> {
  const res = await fetch(sessionUri, {
    method: 'PUT',
    headers: {
      'Content-Length': '0',
      'Content-Range': `bytes */${totalBytes}`,
    },
  })

  if (res.status === 308) {
    const range = res.headers.get('Range')
    if (range) {
      const match = range.match(/bytes=0-(\d+)/)
      if (match) return parseInt(match[1]) + 1
    }
    return 0
  }

  return 0
}

export async function completeUpload(sessionUri: string): Promise<{ driveFileId: string }> {
  const res = await fetch(sessionUri, {
    method: 'PUT',
    headers: {
      'Content-Length': '0',
    },
  })

  if (!res.ok) throw new Error(`Upload completion failed: ${res.status}`)

  const result = await res.json()
  return { driveFileId: result.id }
}
