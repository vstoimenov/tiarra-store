// Speed gate: mobile Lighthouse (the Lighthouse defaults: Moto G emulation, simulated slow-4G
// throttling) on the three pages the owner was promised would be fast. Not part of the test suite:
// it needs a production server (`pnpm build && pnpm start -p 3101`) and a Chrome.
//
//   node scripts/perf.mjs <base> <label> [--lcp-advisory]
//   pnpm perf http://localhost:3101 local --lcp-advisory      (same as `pnpm perf:local`)
//
// Each page is audited RUNS times (Lighthouse varies from run to run) and the gate uses the median of
// every metric. Writes docs/perf/<YYYY-MM-DD>-<label>.json with every run and the medians.
//
// Strict (the default, used on the deployed preview): exits 1 when a median score is below 90 or a
// median LCP is above 2500 ms.
// With --lcp-advisory (used on the local `next start`, which speaks HTTP/1.1 + gzip and serves the
// pictures from a second origin, so it is slower than what visitors get): exits 1 only when a median
// score is below 90. A median LCP over the limit is printed as `LCP ADVISORY: <url> <ms> > 2500` and
// recorded as `lcpPass: false`, but does not fail the run.
//
// Chrome: Lighthouse finds an installed Chrome itself; set CHROME_PATH to use another binary. The
// Chrome that ran the audits is recorded in the output file.
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'

const MIN_SCORE = 90
const MAX_LCP_MS = 2500
const RUNS = Number(process.env.PERF_RUNS ?? 3)
const PATHS = ['/', '/store/category/women', '/store/yodeyma-paris-edp-eau-de-parfum-100-mlher']

const args = process.argv.slice(2)
const lcpAdvisory = args.includes('--lcp-advisory')
const [base, label] = args.filter((arg) => !arg.startsWith('--'))
if (!base || !label) {
  console.error('usage: node scripts/perf.mjs <base> <label> [--lcp-advisory]')
  process.exit(2)
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

const lighthouse = (url) => {
  let stdout
  try {
    stdout = execFileSync(
      'pnpm',
      [
        'dlx',
        'lighthouse@12',
        url,
        '--only-categories=performance',
        '--output=json',
        '--chrome-flags=--headless=new',
        '--quiet',
      ],
      { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] },
    )
  } catch (error) {
    // Lighthouse prints the whole report even when it fails; the last line of stderr is the reason.
    const reason = String(error.stderr ?? error.message).trim().split('\n').pop()
    console.error(`Lighthouse failed on ${url}: ${reason}`)
    process.exit(2)
  }
  const lhr = JSON.parse(stdout)
  const audit = (id) => lhr.audits[id].numericValue
  return {
    lighthouse: lhr.lighthouseVersion,
    chrome: lhr.environment.hostUserAgent,
    score: Math.round(lhr.categories.performance.score * 100),
    lcpMs: Math.round(audit('largest-contentful-paint')),
    cls: Number(audit('cumulative-layout-shift').toFixed(3)),
    tbtMs: Math.round(audit('total-blocking-time')),
  }
}

const pages = []
let lighthouseVersion = ''
let chrome = ''
for (const path of PATHS) {
  const url = new URL(path, base).toString()
  const runs = []
  for (let i = 1; i <= RUNS; i++) {
    const { lighthouse: version, chrome: userAgent, ...run } = lighthouse(url)
    lighthouseVersion = version
    chrome = userAgent
    runs.push(run)
    console.log(`${path} run ${i}/${RUNS}: score ${run.score}, LCP ${run.lcpMs} ms, CLS ${run.cls}, TBT ${run.tbtMs} ms`)
  }
  const page = {
    path,
    url,
    score: median(runs.map((r) => r.score)),
    lcpMs: median(runs.map((r) => r.lcpMs)),
    cls: median(runs.map((r) => r.cls)),
    tbtMs: median(runs.map((r) => r.tbtMs)),
    runs,
  }
  page.scorePass = page.score >= MIN_SCORE
  page.lcpPass = page.lcpMs <= MAX_LCP_MS
  page.pass = page.scorePass && (lcpAdvisory || page.lcpPass)
  pages.push(page)
}

const date = new Date().toLocaleDateString('sv-SE')
const result = {
  date,
  label,
  base,
  lighthouse: lighthouseVersion,
  chrome,
  thresholds: { minScore: MIN_SCORE, maxLcpMs: MAX_LCP_MS },
  lcpAdvisory,
  runsPerPage: RUNS,
  pass: pages.every((p) => p.pass),
  pages,
}

mkdirSync('docs/perf', { recursive: true })
const file = `docs/perf/${date}-${label}.json`
writeFileSync(file, `${JSON.stringify(result, null, 2)}\n`)

console.log('')
for (const p of pages) {
  console.log(`${p.pass ? 'PASS' : 'FAIL'}  ${p.path}  median score ${p.score}, LCP ${p.lcpMs} ms, CLS ${p.cls}, TBT ${p.tbtMs} ms`)
}
if (lcpAdvisory) {
  for (const p of pages) if (!p.lcpPass) console.log(`LCP ADVISORY: ${p.url} ${p.lcpMs} > ${MAX_LCP_MS}`)
}
console.log(`wrote ${file}`)
process.exit(result.pass ? 0 : 1)
