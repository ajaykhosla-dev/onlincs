import 'server-only'
import {
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  HeadObjectCommand,
  ListPartsCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { b2For, environmentB2 } from '@/lib/integrations/credentials'
import { withRetry } from '@/lib/retry'

// B2's S3-compatible API. Bytes go browser -> B2 via these presigned URLs, never through the Next.js server.
// Every key starts with its agency id (agency/cuts/..., agency/voice-notes/..., agency/library/...), so the key
// alone tells us whose bucket and credentials to use; a key can never be signed with another agency's credentials.
const DEFAULT_TTL = 15 * 60

async function target(Key: string) {
  const agencyId = Key.split('/')[0]
  return agencyId.startsWith('ag-') ? b2For(agencyId) : environmentB2
}
/** Back-compat for scripts that want the environment client. */
export const b2 = environmentB2.client

export const presignPut = async (Key: string, ContentType: string, expiresIn = DEFAULT_TTL) => {
  const { client, bucket } = await target(Key)
  return getSignedUrl(client, new PutObjectCommand({ Bucket: bucket, Key, ContentType }), { expiresIn })
}

export const presignGet = async (Key: string, expiresIn = DEFAULT_TTL) => {
  const { client, bucket } = await target(Key)
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key }), { expiresIn })
}

/** Short-lived download URL that makes the browser save the object under a readable name. */
export const presignDownload = async (Key: string, filename: string, expiresIn = 5 * 60) => {
  const { client, bucket } = await target(Key)
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key, ResponseContentDisposition: `attachment; filename="${filename}"`, ResponseContentType: 'video/mp4' }), { expiresIn })
}

export async function createMultipart(Key: string, ContentType: string) {
  const { client, bucket } = await target(Key)
  const res = await withRetry(() => client.send(new CreateMultipartUploadCommand({ Bucket: bucket, Key, ContentType })), { service: 'Backblaze B2' })
  if (!res.UploadId) throw new Error('B2 did not return an UploadId')
  return res.UploadId
}

export const presignPart = async (Key: string, UploadId: string, PartNumber: number, expiresIn = DEFAULT_TTL) => {
  const { client, bucket } = await target(Key)
  return getSignedUrl(client, new UploadPartCommand({ Bucket: bucket, Key, UploadId, PartNumber }), { expiresIn })
}

export const completeMultipart = async (Key: string, UploadId: string, parts: { PartNumber: number; ETag: string }[]) => {
  const { client, bucket } = await target(Key)
  return withRetry(() => client.send(new CompleteMultipartUploadCommand({ Bucket: bucket, Key, UploadId, MultipartUpload: { Parts: parts } })), { service: 'Backblaze B2' })
}

export const abortMultipart = async (Key: string, UploadId: string) => {
  const { client, bucket } = await target(Key)
  return client.send(new AbortMultipartUploadCommand({ Bucket: bucket, Key, UploadId }))
}

export const headObject = async (Key: string) => {
  const { client, bucket } = await target(Key)
  return withRetry(() => client.send(new HeadObjectCommand({ Bucket: bucket, Key })), { service: 'Backblaze B2' })
}
export const listParts = async (Key: string, UploadId: string) => {
  const { client, bucket } = await target(Key)
  return client.send(new ListPartsCommand({ Bucket: bucket, Key, UploadId, MaxParts: 1000 }))
}

/** Inspect only the first MiB; the media itself still streams browser -> B2. */
export async function hasFaststart(Key: string): Promise<boolean | null> {
  const { client, bucket } = await target(Key)
  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key, Range: 'bytes=0-1048575' }))
  if (!response.Body) return null
  const bytes = await response.Body.transformToByteArray()
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  for (let offset = 0; offset + 8 <= bytes.length;) {
    const size = view.getUint32(offset)
    const type = String.fromCharCode(...bytes.subarray(offset+4,offset+8))
    if (type === 'moov') return true
    if (type === 'mdat') return false
    if (size < 8 || size > bytes.length-offset) return null
    offset += size
  }
  return null
}

export const deleteObject = async (Key: string) => {
  const { client, bucket } = await target(Key)
  return withRetry(() => client.send(new DeleteObjectCommand({ Bucket: bucket, Key })), { service: 'Backblaze B2' })
}

/** Unsigned URL for the object — must be rejected (401/403) by a private bucket. */
export const unsignedUrl = async (Key: string) => {
  const { endpoint, bucket } = await target(Key)
  return `${endpoint}/${bucket}/${Key}`
}
