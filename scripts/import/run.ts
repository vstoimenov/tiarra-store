// Imports the live catalog into the database (see package.json: `pnpm import:live`).
// Safe to rerun: products, variants and images are matched, not duplicated.
//
// The last line printed is `warnings: N`. Exit code:
//   0  imported, no warnings
//   1  a product page could not be imported at all (or the run crashed): the catalog is incomplete
//   3  imported with warnings (a picture failed to download, say); read the report
import { mkdirSync, writeFileSync } from 'node:fs'
import { sql } from '../../lib/db'
import { importExitCode } from './exit-code'
import { fetchLive, liveProductUrls } from './fetch-live'
import { importImage } from './images'
import { parseProductPage } from './parse-product'
import { upsertProduct } from './upsert'

interface Report {
  products: number
  categories: number
  variants: number
  images: number
  warnings: string[]
}

async function main(): Promise<void> {
  const urls = await liveProductUrls()
  console.log(`${urls.length} product pages in the sitemap`)

  const categoryIds = new Set<number>()
  const report: Report = { products: 0, categories: 0, variants: 0, images: 0, warnings: [] }
  let failedPages = 0

  // One page at a time: the live site and the image CDN are polite-rate only.
  for (const [index, url] of urls.entries()) {
    const position = `[${index + 1}/${urls.length}]`
    try {
      const product = parseProductPage(await fetchLive(url))
      const result = await upsertProduct(product, { importImage })

      product.categories.forEach((c) => categoryIds.add(c.legacyId))
      report.products++
      report.variants += result.variants
      report.images += result.images
      report.warnings.push(...result.warnings)
      console.log(`${position} ${product.slug}: ${result.variants} variants, ${result.images} images`)
      result.warnings.forEach((w) => console.warn(`  warning: ${w}`))
    } catch (error) {
      failedPages++
      const warning = `${url}: ${error instanceof Error ? error.message : String(error)}`
      report.warnings.push(warning)
      console.warn(`${position} warning: ${warning}`)
    }
  }
  report.categories = categoryIds.size

  const file = `docs/import/report-${new Date().toISOString().slice(0, 10)}.json`
  mkdirSync('docs/import', { recursive: true })
  writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`)
  console.log(JSON.stringify({ ...report, warnings: report.warnings.length }, null, 2))
  console.log(`report written to ${file}`)
  console.log(`warnings: ${report.warnings.length}`)

  await sql.end()
  process.exitCode = importExitCode({ failedPages, warnings: report.warnings.length })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
