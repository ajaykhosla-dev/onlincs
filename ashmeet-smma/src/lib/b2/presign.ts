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

export const deleteObject = (Key: string) => b2.send(new DeleteObjectCommand({ Bucket, Key }))

/** Unsigned URL for the object — must be rejected (401/403) by a private bucket. */
export const unsignedUrl = (Key: string) => `${env.B2_ENDPOINT}/${Bucket}/${Key}`
