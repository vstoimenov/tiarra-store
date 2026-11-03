// Integration tests truncate catalog tables, so they run in their own database on the local
// Supabase Postgres and never against the dev catalog (`postgres`) or anything remote.

export const TEST_DB_NAME = 'tiarra_test'

const DEFAULT_BASE_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const LOCAL_HOSTS = ['127.0.0.1', 'localhost']

/** The dev connection string with its database swapped for `tiarra_test`. */
export function testDatabaseUrl(baseUrl: string | undefined): string {
  const url = new URL(baseUrl || DEFAULT_BASE_URL)
  url.pathname = `/${TEST_DB_NAME}`
  return url.toString()
}

/** Throws unless `url` is the `tiarra_test` database on this machine. */
export function assertTestDatabase(url: string | undefined): void {
  let parsed: URL
  try {
    parsed = new URL(url ?? '')
  } catch {
    throw new Error('Refusing to touch the database: DATABASE_URL is missing or not a URL')
  }
  if (parsed.pathname !== `/${TEST_DB_NAME}`) {
    throw new Error(`Refusing to touch the database: it must be "${TEST_DB_NAME}", got "${parsed.pathname.slice(1)}"`)
  }
  if (!LOCAL_HOSTS.includes(parsed.hostname)) {
    throw new Error(`Refusing to touch the database: host must be ${LOCAL_HOSTS.join(' or ')}, got "${parsed.hostname}"`)
  }
  // A `?host=` parameter would make postgres.js connect somewhere other than the host checked above.
  if (parsed.search) throw new Error('Refusing to touch the database: DATABASE_URL must not have a query string')
}
