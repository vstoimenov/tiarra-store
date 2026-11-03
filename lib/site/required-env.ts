// Relative imports only, and nothing from Next: next.config.ts runs this when the config loads.

/**
 * What a hosted build and server cannot work without. A missing NEXT_PUBLIC_SUPABASE_URL does
 * not fail anywhere else: every picture address silently becomes `undefined/storage/…`.
 */
export const REQUIRED_ENV = ['NEXT_PUBLIC_SUPABASE_URL', 'DATABASE_URL', 'SITE_URL'] as const

/**
 * Throws, naming every missing variable, when `SITE_ENV` is `preview` or `production` and a
 * required variable is unset or blank. Development (and an unset `SITE_ENV`) may use the
 * local defaults, so nothing is checked there.
 */
export function assertRequiredEnv(env: Record<string, string | undefined> = process.env): void {
  const siteEnv = env.SITE_ENV
  if (siteEnv !== 'production' && siteEnv !== 'preview') return

  const missing = REQUIRED_ENV.filter((name) => !env[name]?.trim())
  if (missing.length > 0) {
    throw new Error(
      `Missing environment variables for SITE_ENV="${siteEnv}": ${missing.join(', ')}. Set them before building or starting the site (see .env.example).`,
    )
  }
}
