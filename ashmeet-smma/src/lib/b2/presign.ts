import { env } from '@/lib/env'

export const b2Config = {
  endpoint: env.B2_ENDPOINT,
  region: env.B2_REGION,
  bucket: env.B2_BUCKET,
  keyId: env.B2_KEY_ID,
  applicationKey: env.B2_APPLICATION_KEY,
}

/**
 * Generate a presigned upload URL for B2.
 */
export async function getUploadUrl(fileName: string, contentType: string): Promise<{ uploadUrl: string; fileId: string }> {
  const res = await fetch(`${b2Config.endpoint}/${b2Config.bucket}/${fileName}`, {
    method: 'PUT',
    headers: {
      Authorization: `Basic ${Buffer.from(`${b2Config.keyId}:${b2Config.applicationKey}`).toString('base64')}`,
      'Content-Type': contentType,
      'X-Bz-File-Name': encodeURIComponent(fileName),
      'X-Bz-Content-Type': contentType,
    },
  })

  if (!res.ok) throw new Error(`B2 upload failed: ${res.status}`)
  return { uploadUrl: res.url, fileId: res.headers.get('X-Bz-File-Id') || '' }
}

/**
 * Generate a presigned download URL for B2.
 */
export function getDownloadUrl(fileName: string): string {
  const authHeader = Buffer.from(`${b2Config.keyId}:${b2Config.applicationKey}`).toString('base64')
  return `${b2Config.endpoint}/b2api/v1/b2_download_file_by_name?fileName=${encodeURIComponent(fileName)}&bucket=${b2Config.bucket}`
}

/**
 * Download a file from B2 with range support (for video scrubbing).
 */
export async function downloadRange(fileName: string, start: number, end: number): Promise<Response> {
  const url = getDownloadUrl(fileName)
  return fetch(url, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${b2Config.keyId}:${b2Config.applicationKey}`).toString('base64')}`,
      Range: `bytes=${start}-${end}`,
    },
  })
}
