import 'server-only'
import { google } from 'googleapis'
import { env } from '@/lib/env'

// Service account auth. The key is supplied as email + PEM private key (newlines already
// un-escaped by env.ts). The service account must be a member of the Shared Drive.
export const driveAuth = new google.auth.JWT({
  email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
  scopes: ['https://www.googleapis.com/auth/drive'],
})

export const drive = google.drive({ version: 'v3', auth: driveAuth })

export async function serviceAccountToken(): Promise<string> {
  const { token } = await driveAuth.getAccessToken()
  if (!token) throw new Error('Failed to get an access token for the service account')
  return token
}
