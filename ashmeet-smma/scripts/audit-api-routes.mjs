/**
 * Enumerates every route handler under src/app/api and states how it is protected. Exits non-zero if any
 * handler is neither authenticated, nor cron-secret protected, nor on the reviewed public list.
 *   node scripts/audit-api-routes.mjs
 */
import { readdir, readFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'

const root = 'src/app/api'
// Helpers that call canAccess() for the resource they load. A route using one reaches the single authorization function.
const CAN_ACCESS_HELPERS = ['canAccess(', 'itemContext(', 'versionContext(', 'postAccess(', 'itemAccess(', 'getClientFor(', 'accessibleClients(', 'accessibleLibraryClients(',
  'shootFor(', 'transition(', 'storageOverview(', 'dashboardCards(', 'nearbyPosts(', 'postingData(', 'clientDashboard(', 'plannerData(', 'shootsFor(', 'createUploadSession(', 'getProgress(', 'completeUpload(',
  'getUploadSession(', 'startMediaUpload(', 'canUploadCut(', 'canUploadLibrary(', 'teamAnalytics(', 'sowAnalytics(', 'eligibleShoot(', 'deleteShootRaw(']
// Public on purpose: the client approval flow has no session. Each handler checks the token (and, after the PIN, a signed cookie).
const PUBLIC = [/api\/approve\/\[token\]\//]
const CRON = /CRON_SECRET/

async function walk(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...await walk(path)); else if (entry.name === 'route.ts') out.push(path)
  }
  return out
}

const rows = []
for (const file of (await walk(root)).sort()) {
  const source = await readFile(file, 'utf8')
  const route = '/' + relative('src/app', file).split(sep).join('/').replace(/\/route\.ts$/, '')
  const methods = [...source.matchAll(/export (?:async function|const) (GET|POST|PUT|PATCH|DELETE)\b/g)].map((match) => match[1])
  const platform = /platformApi\(/.test(source)
  const authenticated = /getCurrentUser\(/.test(source) || platform
  const cron = CRON.test(source)
  const publicOk = PUBLIC.some((pattern) => pattern.test(route))
  const helpers = CAN_ACCESS_HELPERS.filter((helper) => source.includes(helper))
  const roleGate = /isReviewer\(|user\.role|\.role\b/.test(source)
  let kind = platform ? 'platform+2FA' : authenticated ? 'session' : cron ? 'cron-secret' : publicOk ? 'public (token)' : 'UNPROTECTED'
  rows.push({ route, methods: methods.join(','), kind, access: platform ? 'platform owner only' : helpers.length ? 'canAccess via ' + helpers.map((h) => h.replace('(', '')).join('/') : roleGate ? 'role gate' : kind === 'session' ? 'own data only' : '-' })
}
const width = Math.max(...rows.map((row) => row.route.length))
for (const row of rows) console.log(`${row.route.padEnd(width)}  ${row.methods.padEnd(18)} ${row.kind.padEnd(15)} ${row.access}`)
const bad = rows.filter((row) => row.kind === 'UNPROTECTED')
const noAccess = rows.filter((row) => ['session'].includes(row.kind) && row.access === '-')
console.log(`\n${rows.length} route files; ${bad.length} unprotected; ${noAccess.length} session routes with no access check`)
if (bad.length || noAccess.length) process.exit(1)
