import { readFileSync } from 'node:fs'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { getProductCards } from '@/lib/catalog/queries'
import { sql } from '@/lib/db'
import { sourceKey } from '@/scripts/import/images'
import { parseProductPage } from '@/scripts/import/parse-product'
import type { ParsedProduct } from '@/scripts/import/types'
import { upsertProduct } from '@/scripts/import/upsert'
import { resetCatalog } from './helpers'

beforeEach(resetCatalog)
afterAll(() => sql.end())

function fixture(name: string): ParsedProduct {
  return parseProductPage(readFileSync(new URL(`../fixtures/product-${name}.html`, import.meta.url), 'utf8'))
}

/** A stand-in for importImage that records its calls and can fail for chosen urls. */
function fakeImages(failFor: string[] = []) {
  const calls: { url: string; path: string }[] = []
  return {
    calls,
    deps: {
      importImage: async (url: string, path: string) => {
        calls.push({ url, path })
        if (failFor.includes(url)) throw new Error('download failed (503)')
        return { width: 800, height: 600 }
      },
    },
  }
}

/** The variant whose picture is `imageUrl`. */
async function variantImagePath(product: ParsedProduct, imageUrl: string): Promise<string | null> {
  const variant = product.variants.find((v) => v.imageSourceUrl === imageUrl)
  if (!variant) throw new Error(`no variant uses ${imageUrl}`)
  const [row] = await sql<{ image_path: string | null }[]>`
    select image_path from store.variants where name = ${variant.name}`
  return row.image_path
}

async function count(table: 'products' | 'variants' | 'product_images' | 'categories'): Promise<number> {
  const [row] = await sql<{ n: number }[]>`select count(*)::int as n from ${sql(`store.${table}`)}`
  return row.n
}

describe('upsertProduct', () => {
  it('upsert is idempotent', async () => {
    const product = fixture('yodeyma')
    const images = fakeImages()

    const first = await upsertProduct(product, images.deps)
    const second = await upsertProduct(product, images.deps)

    expect(second.productId).toBe(first.productId)
    expect(await count('products')).toBe(1)
    expect(await count('variants')).toBe(10)
    expect(await count('product_images')).toBe(10)
    expect(await count('categories')).toBe(3)
    expect(images.calls).toHaveLength(10)
  })

  it('import survives a failed image', async () => {
    const product = fixture('yodeyma')
    const failing = product.images[1].sourceUrl
    const images = fakeImages([failing])

    const { warnings } = await upsertProduct(product, images.deps)

    expect(await count('product_images')).toBe(9)
    expect(warnings).toEqual([`${product.slug}: image ${failing} failed: download failed (503)`])
    expect(warnings[0]).toContain('image')
    // The product itself and the variant that points at the failed image are still saved.
    expect(await count('variants')).toBe(10)
    expect(await variantImagePath(product, failing)).toBeNull()
  })

  it('retries an image that failed on the previous run, and only that one', async () => {
    const product = fixture('yodeyma')
    const failing = product.images[1].sourceUrl
    await upsertProduct(product, fakeImages([failing]).deps)

    const retry = fakeImages()
    const { warnings } = await upsertProduct(product, retry.deps)

    expect(warnings).toEqual([])
    expect(retry.calls.map((c) => c.url)).toEqual([failing])
    expect(await count('product_images')).toBe(10)
    expect(await variantImagePath(product, failing)).toBe(`p/${sourceKey(failing)}`)
  })

  it('stores a variant image that is not in the gallery once, without a gallery row', async () => {
    const live = fixture('yodeyma')
    const extra = 'https://content.app-sources.com/s/1/uploads/extra-variant-photo.jpg'
    const product: ParsedProduct = {
      ...live,
      variants: live.variants.map((v, i) => (i === 0 ? { ...v, imageSourceUrl: extra } : v)),
    }
    const images = fakeImages()

    await upsertProduct(product, images.deps)
    await upsertProduct(product, images.deps)

    expect(images.calls.filter((c) => c.url === extra)).toHaveLength(1)
    expect(images.calls).toHaveLength(11)
    expect(await count('product_images')).toBe(10)
    const [row] = await sql<{ image_path: string | null }[]>`
      select image_path from store.variants where name = ${product.variants[0].name}`
    expect(row.image_path).toBe(`p/${sourceKey(extra)}`)
  })

  it('gender and brand are stored', async () => {
    await upsertProduct(fixture('yodeyma'), fakeImages().deps)

    const [row] = await sql<{ gender: string; brand: string | null }[]>`
      select gender, brand from store.products where legacy_id = 162`

    expect(row).toEqual({ gender: 'female', brand: 'YODEYMA' })
  })

  it('stores images under p/<sourceKey>, in page order, and points variants at them', async () => {
    const product = fixture('yodeyma')
    await upsertProduct(product, fakeImages().deps)

    const rows = await sql<{ source_key: string; path: string; width: number; height: number; alt: string }[]>`
      select source_key, path, width, height, alt from store.product_images order by position`
    expect(rows.map((r) => r.path)).toEqual(product.images.map((i) => `p/${sourceKey(i.sourceUrl)}`))
    expect(rows.map((r) => r.source_key)).toEqual(product.images.map((i) => sourceKey(i.sourceUrl)))
    expect(rows[0]).toMatchObject({ width: 800, height: 600, alt: product.title })

    const variants = await sql<{ name: string; image_path: string | null }[]>`
      select name, image_path from store.variants`
    for (const variant of product.variants) {
      expect(variants.find((v) => v.name === variant.name)?.image_path).toBe(`p/${sourceKey(variant.imageSourceUrl!)}`)
    }
  })

  it('product price, compare-at price and stock hold the cheapest variant', async () => {
    await upsertProduct(fixture('yodeyma'), fakeImages().deps)

    const [row] = await sql<{ price: string; compare_at_price: string | null; stock: number | null }[]>`
      select price, compare_at_price, stock from store.products`

    // BLACK ELIXIR is the first of the cheapest (29.90) variants.
    expect(row).toEqual({ price: '29.90', compare_at_price: '34.90', stock: 2 })
  })

  it('keeps the page prices and stock on a product without variants', async () => {
    await upsertProduct(fixture('redone'), fakeImages().deps)

    const [row] = await sql<{ price: string; compare_at_price: string | null; stock: number | null; perfume: unknown }[]>`
      select price, compare_at_price, stock, perfume from store.products`

    expect(row).toMatchObject({ price: '7.90', compare_at_price: '9.90', stock: 2 })
    expect(row.perfume).toMatchObject({ top: expect.stringContaining('ананас') })
    expect(await count('variants')).toBe(0)
  })

  it('updates changed values and drops variants and images that left the page', async () => {
    const product = fixture('yodeyma')
    const images = fakeImages()
    await upsertProduct(product, images.deps)

    const changed: ParsedProduct = {
      ...product,
      title: 'YODEYMA Paris EDP renamed',
      images: product.images.slice(0, 8),
      variants: product.variants
        .filter((v) => v.name !== 'LINET')
        .map((v) => (v.name === 'BOREAL' ? { ...v, price: 19.9, stock: 7 } : v)),
    }
    await upsertProduct(changed, images.deps)

    expect(await count('products')).toBe(1)
    expect(await count('variants')).toBe(9)
    expect(await count('product_images')).toBe(8)
    const [boreal] = await sql<{ price: string; stock: number }[]>`
      select price, stock from store.variants where name = 'BOREAL'`
    expect(boreal).toEqual({ price: '19.90', stock: 7 })
    const [row] = await sql<{ title: string; price: string }[]>`select title, price from store.products`
    expect(row).toEqual({ title: 'YODEYMA Paris EDP renamed', price: '19.90' })
  })
})

describe('creation time', () => {
  /** The no-variant fixture under another live id and slug. */
  const withLegacyId = (legacyId: number): ParsedProduct => ({
    ...fixture('redone'),
    legacyId,
    slug: `product-${legacyId}`,
  })

  async function createdAt(legacyId: number): Promise<string> {
    const [row] = await sql<{ created_at: Date }[]>`select created_at from store.products where legacy_id = ${legacyId}`
    return row.created_at.toISOString()
  }

  it('newest-first follows the live id, not the order the pages were imported in', async () => {
    const images = fakeImages()

    await upsertProduct(withLegacyId(100), images.deps)
    await upsertProduct(withLegacyId(50), images.deps)

    expect((await getProductCards()).map((c) => c.slug)).toEqual(['product-100', 'product-50'])
  })

  it('stamps a new product with a fixed date plus its live id in seconds', async () => {
    await upsertProduct(withLegacyId(100), fakeImages().deps)

    expect(await createdAt(100)).toBe('2020-01-01T00:01:40.000Z')
  })

  it('keeps the creation time when the product is imported again', async () => {
    const images = fakeImages()
    await upsertProduct(withLegacyId(100), images.deps)
    await upsertProduct(withLegacyId(50), images.deps)
    const before = await createdAt(100)

    // A later run that retries page 100 (say it failed the first time) must not move it up.
    await upsertProduct({ ...withLegacyId(100), title: 'Renamed' }, images.deps)

    expect(await createdAt(100)).toBe(before)
    expect((await getProductCards()).map((c) => c.slug)).toEqual(['product-100', 'product-50'])
  })
})
