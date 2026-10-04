/** Dry-run by default. Updates an existing B2 Native CORS rule for localhost S3 multipart PUT. */
import { env } from '../src/lib/env'

type CorsRule = { corsRuleName: string; allowedOrigins: string[]; allowedOperations: string[];
  allowedHeaders?: string[]; exposeHeaders?: string[]; maxAgeSeconds: number }
type Bucket = { bucketId: string; bucketName: string; revision: number; corsRules: CorsRule[] }

async function checked(response: Response) {
  const data = await response.json()
  if (!response.ok) throw new Error(`${response.status}: ${data.code ?? 'B2 error'}: ${data.message ?? 'Request failed'}`)
  return data
}

async function main() {
  const apply = process.argv.includes('--apply')
  const basic = Buffer.from(`${env.B2_KEY_ID}:${env.B2_APPLICATION_KEY}`).toString('base64')
  const auth = await checked(await fetch('https://api.backblazeb2.com/b2api/v4/b2_authorize_account',
    { headers: { Authorization: `Basic ${basic}` } }))
  const storage = auth.apiInfo.storageApi
  const apiUrl = storage.apiUrl as string
  const headers = { Authorization: auth.authorizationToken as string, 'Content-Type': 'application/json' }
  const list = await checked(await fetch(`${apiUrl}/b2api/v4/b2_list_buckets`,{ method:'POST',headers,
    body:JSON.stringify({ accountId:auth.accountId,bucketName:env.B2_BUCKET }) }))
  const bucket = (list.buckets as Bucket[]).find((entry) => entry.bucketName === env.B2_BUCKET)
  if (!bucket) throw new Error('Configured B2 bucket was not returned')
  const rules = structuredClone(bucket.corsRules ?? [])
  const local = rules.find((rule) => rule.allowedOrigins.includes('http://localhost:3000')
    && rule.allowedOperations.some((operation) => operation.startsWith('s3_')))
  if (!local) throw new Error('Existing localhost S3 CORS rule was not found')
  local.allowedOperations = [...new Set([...local.allowedOperations,'s3_put'])]
  local.allowedHeaders = [...new Set([...(local.allowedHeaders ?? []),'content-type'])]
  console.log(JSON.stringify({ bucketName:bucket.bucketName,revision:bucket.revision,
    canWriteBuckets:(storage.allowed.capabilities as string[]).includes('writeBuckets'),corsRules:rules },null,2))
  if (!apply) { console.log('Dry run only. No bucket settings changed.'); return }
  if (!(storage.allowed.capabilities as string[]).includes('writeBuckets'))
    throw new Error('This B2 application key lacks writeBuckets; a bucket-admin key or dashboard update is required')
  const changed = await checked(await fetch(`${apiUrl}/b2api/v4/b2_update_bucket`,{ method:'POST',headers,
    body:JSON.stringify({ accountId:auth.accountId,bucketId:bucket.bucketId,corsRules:rules,ifRevisionIs:bucket.revision }) }))
  if (!(changed.corsRules as CorsRule[])?.some((rule) => rule.allowedOrigins.includes('http://localhost:3000') && rule.allowedOperations.includes('s3_put')))
    throw new Error('Updated CORS rule was not returned by B2')
  console.log('B2 localhost S3 PUT CORS rule is active.')
}
main().catch((error) => { console.error(error instanceof Error ? `${error.name}: ${error.message}` : error); process.exitCode=1 })
