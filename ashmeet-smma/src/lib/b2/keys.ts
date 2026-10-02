/**
 * B2 key helpers.
 * These generate presigned URLs for upload/download operations.
 * Used by Phase 5 (editor media) and Phase 6 (review/approval).
 */

import { env } from '@/lib/env'

export const b2Config = {
  endpoint: env.B2_ENDPOINT,
  region: env.B2_REGION,
  bucket: env.B2_BUCKET,
  keyId: env.B2_KEY_ID,
  applicationKey: env.B2_APPLICATION_KEY,
}

/**
 * Build the S3-compatible authorization header for B2.
 */
export function b2AuthHeader(): string {
  return `Basic ${Buffer.from(`${b2Config.keyId}:${b2Config.applicationKey}`).toString('base64')}`
}

/**
 * Generate a presigned upload URL for a specific file key.
 * The file is uploaded directly to B2 — bytes never touch the Next.js server.
 */
export function presignUploadUrl(fileName: string, contentType: string): string {
  const encodedName = encodeURIComponent(fileName)
  return `${b2Config.endpoint}/${b2Config.bucket}/${encodedName}`
}

/**
 * Generate a presigned download URL for a specific file key.
 */
export function presignDownloadUrl(fileName: string): string {
  const encodedName = encodeURIComponent(fileName)
  return `${b2Config.endpoint}/${b2Config.bucket}/${encodedName}`
}
