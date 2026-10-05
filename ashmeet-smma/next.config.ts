import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async headers() {
    return [
      // The browser must re-check the service worker on every visit so a deployment replaces it without a cache clear.
      { source: '/sw.js', headers: [
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        { key: 'Service-Worker-Allowed', value: '/' },
      ] },
    ]
  },
}

/**
 * Source maps are uploaded to Sentry only when SENTRY_AUTH_TOKEN, SENTRY_ORG and SENTRY_PROJECT are set (in CI/Vercel),
 * so a local build and a build without Sentry credentials are unaffected.
 */
export default async function config() {
  if (process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT) {
    const { withSentryConfig } = await import('@sentry/nextjs')
    return withSentryConfig(nextConfig, { org: process.env.SENTRY_ORG, project: process.env.SENTRY_PROJECT, authToken: process.env.SENTRY_AUTH_TOKEN, silent: true,
      widenClientFileUpload: true, sourcemaps: { deleteSourcemapsAfterUpload: true } })
  }
  return nextConfig
}
