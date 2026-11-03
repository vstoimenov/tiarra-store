import type postgres from 'postgres'
import { sql } from '../../lib/db'
import { detectBrand, detectGender } from './brand'
import { sourceKey } from './images'
import { parsePerfumeNotes } from './perfume'
import type { ParsedCategory, ParsedProduct, ParsedVariant } from './types'

/** What `sql` and the `tx` handle of a transaction have in common. */
type Db = postgres.ISql

export interface ImportDeps {
  /** Downloads `url`, resizes it and stores it under `path` (the real one is `importImage`). */
  importImage: (url: string, path: string) => Promise<{ width: number; height: number }>
}

export interface UpsertResult {
  productId: string
  warnings: string[]
  /** Variant and image rows the product has after this run. */
  variants: number
  images: number
}

interface StoredImage {
  sourceKey: string
  path: string
  /** Known for gallery images; a variant image outside the gallery is only needed by its path. */
  size: { width: number; height: number } | null
}

/** Keyed by the live site's category id; the position column is left to the admin. */
export async function upsertCategory(category: ParsedCategory, db: Db = sql): Promise<string> {
  const [row] = await db<{ id: string }[]>`
    insert into store.categories (legacy_id, slug, name)
    values (${category.legacyId}, ${category.slug}, ${category.name})
    on conflict (legacy_id) do update set slug = excluded.slug, name = excluded.name
    returning id`
  return row.id
}

/**
 * Creation time of a product first seen now: a fixed date plus its live id in seconds. "Newest
 * first" then follows the live ids (a higher id is a newer product) however the pages are
 * imported; `now()` would stamp whichever page happens to be saved last, so a product retried
 * after a failed page would sit at the top forever. The conflict clause leaves it untouched.
 */
function createdAtFor(db: Db, legacyId: number) {
  return db`timestamptz '2020-01-01 00:00:00+00' + make_interval(secs => ${legacyId}::float8)`
}

/** Variants are unique by name; when the page repeats one, the first wins. */
function uniqueVariants(variants: ParsedVariant[]): ParsedVariant[] {
  const seen = new Set<string>()
  return variants.filter((v) => !seen.has(v.name) && seen.add(v.name))
}

/** With variants, the product row shows the cheapest one (the first when several tie). */
function listedPrice(p: ParsedProduct, variants: ParsedVariant[]) {
  if (variants.length === 0) return { price: p.price, compareAtPrice: p.compareAtPrice, stock: p.stock }
  const cheapest = variants.reduce((best, v) => (v.price < best.price ? v : best))
  return { price: cheapest.price, compareAtPrice: cheapest.compareAtPrice, stock: cheapest.stock }
}

/** What an earlier run stored for this product: gallery images by source key, and variant image paths. */
async function storedImages(legacyId: number) {
  const gallery = await sql<{ source_key: string; path: string; width: number; height: number }[]>`
    select i.source_key, i.path, i.width, i.height
    from store.product_images i
    join store.products p on p.id = i.product_id
    where p.legacy_id = ${legacyId}`
  const variants = await sql<{ image_path: string }[]>`
    select v.image_path
    from store.variants v
    join store.products p on p.id = v.product_id
    where p.legacy_id = ${legacyId} and v.image_path is not null`
  return {
    gallery: new Map(gallery.map((r) => [r.source_key, r])),
    variantPaths: new Set(variants.map((r) => r.image_path)),
  }
}

/**
 * Makes sure every image the product uses (gallery and variant images) is in storage, outside any
 * transaction so a slow CDN never holds a database connection. Images an earlier run stored are
 * reused, not uploaded again; a failed one becomes a warning.
 */
async function ensureImages(p: ParsedProduct, deps: ImportDeps) {
  const known = await storedImages(p.legacyId)
  const galleryUrls = new Set(p.images.map((i) => i.sourceUrl))
  const byUrl = new Map<string, StoredImage>()
  const warnings: string[] = []
  const urls = [...galleryUrls, ...p.variants.flatMap((v) => (v.imageSourceUrl ? [v.imageSourceUrl] : []))]

  for (const url of new Set(urls)) {
    const key = sourceKey(url)
    const path = `p/${key}`
    const row = known.gallery.get(key)
    if (row) {
      byUrl.set(url, { sourceKey: key, path: row.path, size: { width: row.width, height: row.height } })
    } else if (!galleryUrls.has(url) && known.variantPaths.has(path)) {
      byUrl.set(url, { sourceKey: key, path, size: null })
    } else {
      try {
        byUrl.set(url, { sourceKey: key, path, size: await deps.importImage(url, path) })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        warnings.push(`${p.slug}: image ${url} failed: ${message}`)
      }
    }
  }
  return { byUrl, warnings }
}

/**
 * Saves one live product in a single transaction, keyed by its live id. Variants and images are
 * matched by name / source key, so a rerun updates rows in place and removes the ones that left
 * the page. Images are uploaded first (see ensureImages); a failed image is skipped with a warning.
 */
export async function upsertProduct(p: ParsedProduct, deps: ImportDeps): Promise<UpsertResult> {
  const { byUrl, warnings } = await ensureImages(p, deps)

  const brand = detectBrand(p.title)
  const gender = detectGender(p.categories.map((c) => c.slug), brand)
  const perfume = parsePerfumeNotes(p.descriptionHtml)
  const variants = uniqueVariants(p.variants)
  const listed = listedPrice(p, variants)

  // Gallery in page order; a source url listed twice keeps its first position.
  const gallery = [...new Map(p.images.map((i) => [i.sourceUrl, i])).values()].flatMap((image) => {
    const stored = byUrl.get(image.sourceUrl)
    return stored?.size ? [{ stored, size: stored.size, alt: image.alt }] : []
  })

  const productId = await sql.begin(async (tx) => {
    const [product] = await tx<{ id: string }[]>`
      insert into store.products
        (legacy_id, slug, title, brand, gender, description_html, price, compare_at_price, stock,
         option_name, perfume, seo_description, created_at)
      values (
        ${p.legacyId}, ${p.slug}, ${p.title}, ${brand}, ${gender}, ${p.descriptionHtml},
        ${listed.price}, ${listed.compareAtPrice}, ${listed.stock},
        ${p.optionName}, ${perfume ? tx.json({ ...perfume }) : null}, ${p.seoDescription},
        ${createdAtFor(tx, p.legacyId)}
      )
      on conflict (legacy_id) do update set
        slug = excluded.slug,
        title = excluded.title,
        brand = excluded.brand,
        gender = excluded.gender,
        description_html = excluded.description_html,
        price = excluded.price,
        compare_at_price = excluded.compare_at_price,
        stock = excluded.stock,
        option_name = excluded.option_name,
        perfume = excluded.perfume,
        seo_description = excluded.seo_description,
        updated_at = now()
      returning id`

    await tx`delete from store.product_categories where product_id = ${product.id}`
    for (const category of p.categories) {
      const categoryId = await upsertCategory(category, tx)
      await tx`insert into store.product_categories (product_id, category_id) values (${product.id}, ${categoryId})
               on conflict do nothing`
    }

    await tx`delete from store.variants
             where product_id = ${product.id} and not (name = any(${tx.array(variants.map((v) => v.name))}::text[]))`
    if (variants.length > 0) {
      const rows = variants.map((v, position) => ({
        product_id: product.id,
        name: v.name,
        price: v.price,
        compare_at_price: v.compareAtPrice,
        stock: v.stock,
        sku: v.sku,
        image_path: v.imageSourceUrl ? (byUrl.get(v.imageSourceUrl)?.path ?? null) : null,
        position,
      }))
      await tx`
        insert into store.variants ${tx(rows, 'product_id', 'name', 'price', 'compare_at_price', 'stock', 'sku', 'image_path', 'position')}
        on conflict (product_id, name) do update set
          price = excluded.price,
          compare_at_price = excluded.compare_at_price,
          stock = excluded.stock,
          sku = excluded.sku,
          image_path = excluded.image_path,
          position = excluded.position`
    }

    await tx`delete from store.product_images
             where product_id = ${product.id} and not (source_key = any(${tx.array(gallery.map((g) => g.stored.sourceKey))}::text[]))`
    if (gallery.length > 0) {
      const rows = gallery.map(({ stored, size, alt }, position) => ({
        product_id: product.id,
        source_key: stored.sourceKey,
        path: stored.path,
        width: size.width,
        height: size.height,
        alt,
        position,
      }))
      await tx`
        insert into store.product_images ${tx(rows, 'product_id', 'source_key', 'path', 'width', 'height', 'alt', 'position')}
        on conflict (product_id, source_key) do update set
          path = excluded.path,
          width = excluded.width,
          height = excluded.height,
          alt = excluded.alt,
          position = excluded.position`
    }

    return product.id
  })

  return { productId, warnings, variants: variants.length, images: gallery.length }
}
