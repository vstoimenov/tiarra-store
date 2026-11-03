import { readFileSync } from 'node:fs'
import { isAvailable } from '@/lib/catalog/stock'
import type { Product } from '@/lib/catalog/types'
import { parseProductPage } from '@/scripts/import/parse-product'

type FixtureName = 'product-yodeyma' | 'product-simple' | 'product-redone'

/**
 * A `Product` as the storefront reads it, built from one of the saved live pages: the same
 * titles, prices, stock, variants and categories the import writes. Images get the paths
 * `p/<fixture>-<n>` (the real ones are hashes of the source URL), and a variant points at the
 * image its source URL matches. `overrides` replace whole fields.
 */
export function productFromFixture(name: FixtureName, overrides: Partial<Product> = {}): Product {
  const parsed = parseProductPage(readFileSync(new URL(`../../fixtures/${name}.html`, import.meta.url), 'utf8'))

  const images = parsed.images.map((image, position) => ({
    path: `p/${name}-${position}`,
    width: 800,
    height: 800,
    alt: image.alt,
    position,
  }))
  const variants = parsed.variants.map((variant, position) => ({
    id: `${name}-v${position}`,
    name: variant.name,
    price: variant.price,
    compareAtPrice: variant.compareAtPrice,
    stock: variant.stock,
    sku: variant.sku,
    imagePath: images[parsed.images.findIndex((image) => image.sourceUrl === variant.imageSourceUrl)]?.path ?? null,
    position,
  }))
  const categories = parsed.categories.map((category, position) => ({
    id: `${name}-c${position}`,
    slug: category.slug,
    name: category.name,
    position,
  }))

  // The card's price is the cheapest variant's when there are variants, else the product's own.
  const cheapest = [...variants].sort((a, b) => a.price - b.price || a.position - b.position)[0]
  const product: Product = {
    slug: parsed.slug,
    title: parsed.title,
    brand: null,
    gender: 'female',
    imagePath: images[0]?.path ?? null,
    price: cheapest ? cheapest.price : parsed.price,
    compareAtPrice: cheapest ? cheapest.compareAtPrice : parsed.compareAtPrice,
    hasVariants: variants.length > 0,
    inStock: (variants.length > 0 ? variants.map((v) => v.stock) : [parsed.stock]).some(isAvailable),
    categorySlugs: categories.map((c) => c.slug),
    createdAt: '2026-10-30T00:00:00.000Z',
    id: `${name}-id`,
    legacyId: parsed.legacyId,
    stock: parsed.stock,
    descriptionHtml: parsed.descriptionHtml,
    optionName: parsed.optionName,
    perfume: null,
    seoTitle: null,
    seoDescription: parsed.seoDescription || null,
    variants,
    images,
    categories,
  }
  return { ...product, ...overrides }
}
