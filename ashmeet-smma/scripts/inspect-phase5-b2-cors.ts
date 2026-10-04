import { GetBucketCorsCommand } from '@aws-sdk/client-s3'
import { b2 } from '../src/lib/b2/presign'
import { env } from '../src/lib/env'

async function main() { try {
  const result = await b2.send(new GetBucketCorsCommand({ Bucket: env.B2_BUCKET }))
  console.log(JSON.stringify(result.CORSRules ?? [],null,2))
} catch (error) {
  console.error(error instanceof Error ? `${error.name}: ${error.message}` : error)
  process.exitCode = 1
} }
void main()
