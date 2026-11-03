// Checks that the new site answers on the addresses people already have:
//
//   pnpm check:urls http://localhost:3100
//
// It takes every address of the live shop's sitemap and moves it onto <base>. A real page has to
// answer 200; the template pages of the old shop (/blog/…, /about-us, …) have to answer a 301 to
// the page that took their place. Two more lists are checked as 200s: the addresses of this
// site's own sitemap, and every internal link of the seeded menu and footer. Redirects are never
// followed (`redirect: 'manual'`), so a 308 or a redirect where a page belongs is a failure.
// Failures are printed and the exit code is 1; nothing here needs a database or an env file.
import { readFileSync } from 'node:fs'
import { NavigationSchema, type Navigation } from '../lib/site/schema'
import { fetchLive, LIVE_SITE, parseSitemapLocs, USER_AGENT } from './import/fetch-live'
import { isMain } from './is-main'

export type Expectation = { status: 200 } | { status: 301; location: string }

// What the live shop's template pages have to become. Deliberately spelled out here and not read
// from next.config.ts, so a wrong redirect in the config is caught instead of repeated.
const TEMPLATE_PAGES: { path: RegExp; location: string }[] = [
  { path: /^\/blog(\/.*)?$/, location: '/' },
  { path: /^\/about-us$/, location: '/promo/za-nas' },
  { path: /^\/contact-us$/, location: '/promo/kontakti' },
  { path: /^\/special-deals$/, location: '/promo' },
  { path: /^\/dsa$/, location: '/' },
  { path: /^\/shipping-terms$/, location: '/dostavka-plashtane' },
  { path: /^\/signin$/, location: '/' },
]

export function expectationFor(pathname: string): Expectation {
  const template = TEMPLATE_PAGES.find((t) => t.path.test(pathname))
  return template ? { status: 301, location: template.location } : { status: 200 }
}

/** The same path and query on another host. A bare `https://host` becomes `<base>/`. */
export function rewriteHost(url: string, base: string): string {
  const source = new URL(url)
  return new URL(source.pathname + source.search, base).toString()
}

/** The internal links of the menu and the footer, once each. */
export function navigationPaths(navigation: Navigation): string[] {
  const hrefs = [...navigation.menu, ...navigation.footer.flatMap((group) => group.links)].map((link) => link.href)
  return [...new Set(hrefs.filter((href) => href.startsWith('/')))]
}

interface Target {
  url: string
  expectation: Expectation
  /** Where the address came from, for the failure line. */
  sources: string[]
}

const CONCURRENCY = 4
// The first request to a dev server compiles the page.
const TIMEOUT_MS = 60_000

async function probe(url: string): Promise<{ status: number; location: string | null }> {
  const res = await fetch(url, {
    redirect: 'manual',
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  await res.body?.cancel()
  return { status: res.status, location: res.headers.get('location') }
}

/** `null` when the address answers as expected, else what was wrong. */
async function problemWith({ url, expectation }: Target): Promise<string | null> {
  let answer: Awaited<ReturnType<typeof probe>>
  try {
    answer = await probe(url)
  } catch (error) {
    return `no answer (${error instanceof Error ? error.message : String(error)})`
  }

  if (answer.status !== expectation.status) {
    const where = answer.location ? ` to ${answer.location}` : ''
    return `expected ${expectation.status}, got ${answer.status}${where}`
  }
  if (expectation.status === 301) {
    const target = answer.location ? new URL(answer.location, url) : null
    if (!target || target.pathname !== expectation.location || target.search !== '') {
      return `expected 301 to ${expectation.location}, got 301 to ${answer.location ?? 'nowhere'}`
    }
  }
  return null
}

/** Runs `work` over `items`, `limit` at a time, and keeps the results in the order of the items. */
async function mapLimit<T, R>(items: T[], limit: number, work: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++
        results[index] = await work(items[index])
      }
    }),
  )
  return results
}

async function collectTargets(base: string): Promise<{ targets: Target[]; setupFailures: string[] }> {
  const found = new Map<string, Target>()
  const add = (url: string, expectation: Expectation, source: string) => {
    const known = found.get(url)
    if (known) known.sources.push(source)
    else found.set(url, { url, expectation, sources: [source] })
  }
  const setupFailures: string[] = []

  const liveXml = await fetchLive(`${LIVE_SITE}/sitemap.xml`)
  for (const loc of parseSitemapLocs(liveXml)) {
    add(rewriteHost(loc, base), expectationFor(new URL(loc).pathname), 'live sitemap')
  }

  const ownSitemap = new URL('/sitemap.xml', base).toString()
  try {
    const res = await fetch(ownSitemap, { headers: { Accept: 'application/xml' }, signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`)
    for (const loc of parseSitemapLocs(await res.text())) add(rewriteHost(loc, base), { status: 200 }, 'own sitemap')
  } catch (error) {
    setupFailures.push(`${ownSitemap}: ${error instanceof Error ? error.message : String(error)}`)
  }

  const navigation = NavigationSchema.parse(JSON.parse(readFileSync(new URL('../seed/navigation.json', import.meta.url), 'utf8')))
  for (const path of navigationPaths(navigation)) add(new URL(path, base).toString(), { status: 200 }, 'navigation')

  return { targets: [...found.values()], setupFailures }
}

async function main(): Promise<void> {
  const base = process.argv[2]
  if (!base || !/^https?:\/\//.test(base)) {
    console.error('Usage: pnpm check:urls <base>   e.g. pnpm check:urls http://localhost:3100')
    process.exit(2)
  }

  const { targets, setupFailures } = await collectTargets(base)
  const problems = await mapLimit(targets, CONCURRENCY, problemWith)

  const failures = [
    ...setupFailures,
    ...targets.flatMap((target, i) => (problems[i] ? [`${target.url}: ${problems[i]} [${target.sources.join(', ')}]`] : [])),
  ]
  for (const failure of failures) console.log(`FAIL ${failure}`)
  console.log(`${targets.length} addresses checked, ${failures.length} failures`)
  process.exit(failures.length > 0 ? 1 : 0)
}

// Only when run as a script: the tests import the helpers above.
if (isMain(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
