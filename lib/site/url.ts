/**
 * The public address of the site, without a trailing slash (`SITE_URL`). Canonical links and
 * structured data need it absolute. Only a local run (`SITE_ENV` is `development` or not set)
 * may do without it, with the dev address standing in; `preview` and `production` without it
 * are mistakes worth failing the build for, since every canonical would point at localhost.
 */
export function siteUrl(): string {
  const url = process.env.SITE_URL?.trim().replace(/\/+$/, '')
  if (url) return url
  const env = process.env.SITE_ENV
  if (env && env !== 'development') throw new Error(`SITE_URL is not set (required when SITE_ENV is "${env}")`)
  return 'http://localhost:3100'
}
