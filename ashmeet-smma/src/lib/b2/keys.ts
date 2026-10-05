/**
 * B2 object-key helpers. Pure functions, no I/O.
 * Layout follows techstack.md §3: {agency}/{client}/{item}/v{n}.mp4 etc.
 */

const safe = (s: string) => s.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '')

export const verifyKey = () => `__verify/phase0-${Date.now()}.bin`

export const cutKey = (agencyId: string, contentItemId: string, version: number, ext = 'mp4') =>
  `${agencyId}/cuts/${contentItemId}/v${version}.${safe(ext)}`

export const voiceNoteKey = (agencyId: string, versionId: string, commentId: string, ext: "webm" | "mp4" = "webm") =>
  `${agencyId}/voice-notes/${versionId}/${commentId}.${ext}`

export const libraryKey = (agencyId: string, clientId: string, folder: string, fileName: string) =>
  `${agencyId}/library/${clientId}/${safe(folder)}/${safe(fileName)}`
