// Screenshots the live site and the local preview at the same widths so layout work can be
// compared by eye. Not a test: it only writes PNGs.
//
//   node scripts/visual-compare.mjs [path] [outDir] [--full]
//
// Needs the local dev or prod server on :3100. Output: <outDir>/<name>-<width>-{live,local}-{top,bottom}.png
// (top = first viewport, bottom = the end of the page, where the footer is).
// With --full the output is one <name>-<width>-{live,local}-full.png per site and width instead:
// the whole page, after scrolling through it once so that lazy images have loaded.
import { mkdirSync } from 'node:fs'
import { chromium } from '@playwright/test'

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const full = process.argv.includes('--full')
const path = args[0] ?? '/'
const outDir = args[1] ?? 'docs/perf/visual'
const name = path === '/' ? 'home' : path.replace(/^\/|\/$/g, '').replace(/[^\p{L}\p{N}]+/gu, '-')
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
const SITES = { live: 'https://tiarracosmetics.com', local: 'http://localhost:3100' }
const SIZES = [
  { width: 375, height: 812 },
  { width: 1280, height: 800 },
]

mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch()
for (const { width, height } of SIZES) {
  for (const [site, origin] of Object.entries(SITES)) {
    const context = await browser.newContext({ viewport: { width, height }, userAgent: UA, locale: 'bg-BG' })
    const page = await context.newPage()
    await page.goto(origin + path, { waitUntil: 'networkidle' })
    // Reduced motion keeps the topbar from fading mid-shot; scrolling to the end loads lazy images.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    // The Next dev-tools badge is not part of the page.
    await page.addStyleTag({ content: 'nextjs-portal { display: none !important }' })
    await page.waitForTimeout(800)
    if (full) {
      const height = await page.evaluate(() => document.documentElement.scrollHeight)
      for (let y = 0; y < height; y += 500) {
        await page.evaluate((top) => window.scrollTo(0, top), y)
        await page.waitForTimeout(120)
      }
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.waitForTimeout(800)
      await page.screenshot({ path: `${outDir}/${name}-${width}-${site}-full.png`, fullPage: true })
    } else {
      await page.screenshot({ path: `${outDir}/${name}-${width}-${site}-top.png` })
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
      await page.waitForTimeout(800)
      await page.screenshot({ path: `${outDir}/${name}-${width}-${site}-bottom.png` })
    }
    await context.close()
  }
}
await browser.close()
