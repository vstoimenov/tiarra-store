// Checks the database against the live site: price, compare-at price and stock of every variant
// (or of the product itself when it has none). Prints `diffs: N` and exits 1 when N > 0.
import { sql } from '../../lib/db'
import { isMain } from '../is-main'
import { fetchLive, liveProductUrls } from './fetch-live'
import { parseProductPage } from './parse-product'
import type { ParsedProduct } from './types'

export interface DbPrice {
  price: number
  compareAtPrice: number | null
  stock: number | null
}

export interface DbProduct extends DbPrice {
  variants: (DbPrice & { name: string })[]
}

/** Prices are whole cents; compare in cents so 29.9 and 29.90 are the same. */
const cents = (value: number | null) => (value === null ? null : Math.round(value * 100))

function diffPrice(label: string, live: DbPrice, db: DbPrice): string[] {
  const diffs: string[] = []
  if (cents(live.price) !== cents(db.price)) diffs.push(`${label}: price live ${live.price}, db ${db.price}`)
  if (cents(live.compareAtPrice) !== cents(db.compareAtPrice)) {
    diffs.push(`${label}: compare-at price live ${live.compareAtPrice}, db ${db.compareAtPrice}`)
  }
  // null means "stock not tracked", which is not the same as 0.
  if (live.stock !== db.stock) diffs.push(`${label}: stock live ${live.stock}, db ${db.stock}`)
  return diffs
}

/**
 * Differences between a freshly parsed live product and what the database holds (undefined =
 * no such product). With variants, the product row is not compared: it shows the cheapest variant.
 */
export function diffProduct(live: ParsedProduct, db: DbProduct | undefined): string[] {
  if (!db) return [`${live.slug}: missing in the database`]
  if (live.variants.length === 0) return diffPrice(live.slug, live, db)

  const dbByName = new Map(db.variants.map((v) => [v.name, v]))
  const diffs = live.variants.flatMap((variant) => {
    const label = `${live.slug} [${variant.name}]`
    const stored = dbByName.get(variant.name)
    return stored ? diffPrice(label, variant, stored) : [`${label}: variant missing in the database`]
  })
  const liveNames = new Set(live.variants.map((v) => v.name))
  for (const stored of db.variants) {
    if (!liveNames.has(stored.name)) diffs.push(`${live.slug} [${stored.name}]: variant is not on the live page`)
  }
  return diffs
}

async function readProduct(legacyId: number): Promise<DbProduct | undefined> {
  const [product] = await sql<(DbPrice & { id: string })[]>`
    select id, price::float8 as price, compare_at_price::float8 as "compareAtPrice", stock
    from store.products where legacy_id = ${legacyId}`
  if (!product) return undefined
  const variants = await sql<(DbPrice & { name: string })[]>`
    select name, price::float8 as price, compare_at_price::float8 as "compareAtPrice", stock
    from store.variants where product_id = ${product.id}`
  return { price: product.price, compareAtPrice: product.compareAtPrice, stock: product.stock, variants }
}

async function main(): Promise<void> {
  const urls = await liveProductUrls()
  const diffs: string[] = []
  let checked = 0

  for (const url of urls) {
    let live: ParsedProduct
    try {
      live = parseProductPage(await fetchLive(url))
    } catch (error) {
      // A page that cannot be read cannot be verified, which counts as a difference.
      diffs.push(`${url}: could not be read: ${error instanceof Error ? error.message : String(error)}`)
      continue
    }
    diffs.push(...diffProduct(live, await readProduct(live.legacyId)))
    checked++
  }

  for (const diff of diffs) console.log(diff)
  console.log(`products checked: ${checked} of ${urls.length}`)
  console.log(`diffs: ${diffs.length}`)
  await sql.end()
  process.exitCode = diffs.length > 0 ? 1 : 0
}

// Run only as a script, not when the tests import diffProduct.
if (isMain(import.meta.url)) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
