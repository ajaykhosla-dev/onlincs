import 'server-only'
import {
  S3Client,
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
import { env } from '@/lib/env'

// B2's S3-compatible API. Bytes go browser -> B2 via these presigned URLs,
// never through the Next.js server.
export const b2 = new S3Client({
  endpoint: env.B2_ENDPOINT,
  region: env.B2_REGION,
  forcePathStyle: true,
  credentials: { accessKeyId: env.B2_KEY_ID, secretAccessKey: env.B2_APPLICATION_KEY },
})

const Bucket = env.B2_BUCKET
const DEFAULT_TTL = 15 * 60

export const presignPut = (Key: string, ContentType: string, expiresIn = DEFAULT_TTL) =>
  getSignedUrl(b2, new PutObjectCommand({ Bucket, Key, ContentType }), { expiresIn })

export const presignGet = (Key: string, expiresIn = DEFAULT_TTL) =>
  getSignedUrl(b2, new GetObjectCommand({ Bucket, Key }), { expiresIn })

export async function createMultipart(Key: string, ContentType: string) {
  const res = await b2.send(new CreateMultipartUploadCommand({ Bucket, Key, ContentType }))
  if (!res.UploadId) throw new Error('B2 did not return an UploadId')
  return res.UploadId
}

export const presignPart = (Key: string, UploadId: string, PartNumber: number, expiresIn = DEFAULT_TTL) =>
  getSignedUrl(b2, new UploadPartCommand({ Bucket, Key, UploadId, PartNumber }), { expiresIn })

export const completeMultipart = (Key: string, UploadId: string, parts: { PartNumber: number; ETag: string }[]) =>
  b2.send(new CompleteMultipartUploadCommand({ Bucket, Key, UploadId, MultipartUpload: { Parts: parts } }))

export const abortMultipart = (Key: string, UploadId: string) =>
  b2.send(new AbortMultipartUploadCommand({ Bucket, Key, UploadId }))

export const headObject = (Key: string) => b2.send(new HeadObjectCommand({ Bucket, Key }))
export const listParts = (Key: string, UploadId: string) =>
  b2.send(new ListPartsCommand({ Bucket, Key, UploadId, MaxParts: 1000 }))

/** Inspect only the first MiB; the media itself still streams browser -> B2. */
export async function hasFaststart(Key: string): Promise<boolean | null> {
  const response = await b2.send(new GetObjectCommand({ Bucket, Key, Range: 'bytes=0-1048575' }))
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

export const deleteObject = (Key: string) => b2.send(new DeleteObjectCommand({ Bucket, Key }))

/** Unsigned URL for the object — must be rejected (401/403) by a private bucket. */
export const unsignedUrl = (Key: string) => `${env.B2_ENDPOINT}/${Bucket}/${Key}`
