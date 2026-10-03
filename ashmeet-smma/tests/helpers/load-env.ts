// Child-process helper for env.test.ts: loads lib/env and reports the outcome as one JSON line.
async function main() {
  try {
    const m = (await import('../../src/lib/env')) as Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
    const env = (m['module.exports'] ?? m).env
    console.log(JSON.stringify({ ok: true, nl: env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.includes('\n-----END PRIVATE KEY-----') }))
  } catch (e) {
    const err = e as Error
    console.log(JSON.stringify({ ok: false, name: err.name, msg: err.message }))
  }
}
main()
