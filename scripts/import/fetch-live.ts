// Reads the live ConvertBuilder site. It rate-limits itself (150 ms between calls) and retries
// transient failures; without the browser headers the site answers 403.

export const LIVE_SITE = 'https://tiarracosmetics.com'
export const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'

const PAUSE_MS = 150
const RETRIES = 3
const RETRY_BACKOFF_MS = 500
const TIMEOUT_MS = 30_000

let lastCallEndedAt = 0

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Waits until PAUSE_MS have passed since the previous call ended (never longer than PAUSE_MS). */
async function pause(): Promise<void> {
  const wait = Math.min(PAUSE_MS, lastCallEndedAt + PAUSE_MS - Date.now())
  if (wait > 0) await sleep(wait)
}

/** Only server trouble, rate limits and dropped connections can pass on their own. */
const isTransient = (status: number) => status === 429 || status >= 500

/** An answer a retry cannot change (404, the 403 of a missing user agent, …). */
class PermanentError extends Error {}

export async function fetchLive(url: string): Promise<string> {
  let failure = ''
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    if (attempt > 0) await sleep(RETRY_BACKOFF_MS * attempt)
    await pause()
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      if (res.status === 200) return await res.text()
      if (!isTransient(res.status)) throw new PermanentError(`HTTP ${res.status}`)
      failure = `HTTP ${res.status}`
    } catch (error) {
      if (error instanceof PermanentError) throw error
      failure = error instanceof Error ? error.message : String(error)
    } finally {
      lastCallEndedAt = Date.now()
    }
  }
  throw new Error(`${failure} (gave up after ${RETRIES + 1} attempts)`)
}

const LOC = /<loc>\s*([^<]+?)\s*<\/loc>/g
// `/store/<slug>` is a product; `/store/category/<slug>` and the bare `/store` are not.
const PRODUCT_PATH = /^\/store\/(?!category\/)[^/]+$/

/** Every address listed in a sitemap, once each, in sitemap order. */
export function parseSitemapLocs(xml: string): string[] {
  const locs = [...xml.matchAll(LOC)].map((m) => m[1].replaceAll('&amp;', '&'))
  return [...new Set(locs)]
}

/** The product urls listed in a sitemap, once each, in sitemap order. */
export function parseSitemapUrls(xml: string): string[] {
  return parseSitemapLocs(xml).filter((loc) => PRODUCT_PATH.test(new URL(loc).pathname))
}

export async function liveProductUrls(): Promise<string[]> {
  const sitemapUrl = `${LIVE_SITE}/sitemap.xml`
  let urls: string[]
  try {
    urls = parseSitemapUrls(await fetchLive(sitemapUrl))
  } catch (error) {
    throw new Error(`${sitemapUrl}: ${error instanceof Error ? error.message : String(error)}`)
  }
  // An answer without a single product (the shop changed its sitemap, or served an error page
  // with a 200) must not look like a successful import of nothing.
  if (urls.length === 0) throw new Error(`${sitemapUrl}: no product pages found in the sitemap`)
  return urls
}
