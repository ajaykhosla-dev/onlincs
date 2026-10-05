import { createHash } from 'node:crypto'

/**
 * Forgiving parsing of what an agency sends over: a service-account JSON file, or just the private key pasted with
 * escaped newlines, stray quotes, CRLF, extra spaces or the line breaks lost. Pure, so every pasted shape is tested.
 */

export type ParsedServiceAccount = { email: string | null; privateKey: string }

const BEGIN = /-----BEGIN (?:RSA )?PRIVATE KEY-----/
const END = /-----END (?:RSA )?PRIVATE KEY-----/

export function normalizePrivateKey(raw: string): string {
  let text = raw.trim()
  // Pasted with the surrounding quotes of a JSON string or .env value.
  while ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) text = text.slice(1, -1).trim()
  text = text.replace(/\\r\\n|\\n|\\r/g, '\n').replace(/\r\n?/g, '\n')
  const begin = text.match(BEGIN), end = text.match(END)
  if (!begin || !end) throw new Error('That does not look like a private key. It should start with -----BEGIN PRIVATE KEY-----.')
  const header = begin[0], footer = end[0]
  const body = text.slice(text.indexOf(header) + header.length, text.indexOf(footer)).replace(/[^A-Za-z0-9+/=]/g, '')
  if (body.length < 100 || body.length % 4 !== 0) throw new Error('The private key is incomplete or has been altered. Paste the whole key again.')
  const lines = body.match(/.{1,64}/g) ?? []
  return `${header}\n${lines.join('\n')}\n${footer}\n`
}

/** Accepts the downloaded JSON key file (email and key together) or only a private key. */
export function parseServiceAccountInput(raw: string): ParsedServiceAccount {
  const text = raw.trim()
  if (text.startsWith('{')) {
    let parsed: { client_email?: unknown; private_key?: unknown; type?: unknown }
    try { parsed = JSON.parse(text) } catch { throw new Error('That looks like JSON but could not be read. Paste the whole file, or just the private key.') }
    if (typeof parsed.private_key !== 'string') throw new Error('The JSON has no private_key field.')
    return { email: typeof parsed.client_email === 'string' ? parsed.client_email.trim() : null, privateKey: normalizePrivateKey(parsed.private_key) }
  }
  return { email: null, privateKey: normalizePrivateKey(text) }
}

/** Safe to show: a short hash identifies a key without revealing it. */
export const fingerprint = (value: string) => `sha256:${createHash('sha256').update(value).digest('hex').slice(0, 12)}`
export const lastFour = (value: string) => value.trim().slice(-4)

/** B2 values pasted from the Backblaze page often carry stray whitespace or quotes. */
export const cleanToken = (value: string) => value.trim().replace(/^["']|["']$/g, '').trim()
