// The connection settings lib/db.ts hands to postgres.js, kept apart so they can be tested
// without opening a connection.

export const DEFAULT_DB_MAX = 3
/** Seconds an unused connection is kept; serverless instances would otherwise pile idle ones onto the pooler. */
export const IDLE_TIMEOUT_SECONDS = 20

const LOCAL_HOSTS = ['127.0.0.1', 'localhost', '[::1]']
// Modes that also check the server's certificate; forcing `require` over them would weaken them.
const STRICT_SSL_MODES = ['verify-ca', 'verify-full']

/**
 * `'require'` for every database that is not on this machine (the hosted Supabase pooler does not
 * encrypt unless asked, and postgres.js defaults to no TLS); nothing for a local one, which stays
 * plain. A url that already asks for certificate checking is left to the driver.
 */
export function sslFor(url: string): 'require' | undefined {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return 'require'
  }
  if (LOCAL_HOSTS.includes(parsed.hostname)) return undefined
  const mode = parsed.searchParams.get('sslmode') ?? parsed.searchParams.get('ssl')
  return mode && STRICT_SSL_MODES.includes(mode) ? undefined : 'require'
}

/** `DB_MAX`: a whole number of 1 or more; unset or empty means the default. A typo fails at startup, not as a hung pool. */
export function parseDbMax(raw: string | undefined): number {
  const text = raw?.trim() ?? ''
  if (text === '') return DEFAULT_DB_MAX
  if (!/^\d+$/.test(text) || Number(text) < 1) {
    throw new Error(`DB_MAX must be a whole number of 1 or more, got "${text}"`)
  }
  return Number(text)
}

export function connectionOptions(url: string, rawMax: string | undefined) {
  const ssl = sslFor(url)
  return {
    prepare: false as const,
    max: parseDbMax(rawMax),
    idle_timeout: IDLE_TIMEOUT_SECONDS,
    ...(ssl ? { ssl } : {}),
  }
}
