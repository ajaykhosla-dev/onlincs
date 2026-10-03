import 'server-only'
import { z } from 'zod'

/**
 * Server-side environment contract. Validated once at import; any missing or
 * malformed variable throws an EnvError naming it. `server-only` makes importing
 * this file from a client component a build error.
 * Client-safe values live in `env.public.ts`.
 */
const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),

  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().email(),
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: z
    .string()
    .min(50)
    .transform((v) => v.replace(/\\n/g, '\n'))
    .refine((v) => v.includes('BEGIN PRIVATE KEY'), 'must be a PEM private key'),
  GOOGLE_SHARED_DRIVE_ID: z.string().min(5),

  B2_ENDPOINT: z.string().url(),
  B2_REGION: z.string().min(1),
  B2_BUCKET: z.string().min(1),
  B2_KEY_ID: z.string().min(1),
  B2_APPLICATION_KEY: z.string().min(10),

  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(10),
  VAPID_PRIVATE_KEY: z.string().min(20),
  VAPID_SUBJECT: z.string().min(5),

  // base64 of 32 random bytes (AES-256-GCM)
  CREDENTIAL_ENCRYPTION_KEY: z.string().refine((v) => Buffer.from(v, 'base64').length === 32, 'must be base64 of 32 bytes'),
  CRON_SECRET: z.string().min(20),
  NEXT_PUBLIC_APP_URL: z.string().url(),

  TRANSCRIPTION_API_KEY: z.string().optional(), // Phase 6
})

export class EnvError extends Error {
  constructor(public readonly variables: string[]) {
    super(`Invalid or missing environment variables: ${variables.join(', ')}`)
    this.name = 'EnvError'
  }
}

function parse() {
  const result = schema.safeParse(process.env)
  if (!result.success) {
    throw new EnvError([...new Set(result.error.issues.map((i) => String(i.path[0])))])
  }
  return result.data
}

export const env = parse()
