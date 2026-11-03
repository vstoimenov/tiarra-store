import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { sql } from '@/lib/db'
import {
  getAllProductSlugs,
  getCategories,
  getCategoryBySlug,
  getProductBySlug,
  getProductSitemapEntries,
  getProductCards,
  getRelatedProducts,
} from '@/lib/catalog/queries'
import { insertTestProduct, resetCatalog } from './helpers'

beforeEach(resetCatalog)
afterAll(() => sql.end())

async function cardFor(slug: string) {
  const cards = await getProductCards()
  const card = cards.find((c) => c.slug === slug)
  if (!card) throw new Error(`no card for ${slug}`)
  return card
}

describe('getProductBySlug', () => {
  it('returns variants in position order and categories', async () => {
    await insertTestProduct({
      slug: 'rose',
      title: 'Rose',
      brand: 'Tiarra',
      gender: 'female',
      price: 49.9,
      optionName: 'Обем',
      perfume: { top: 'bergamot', volume: '50 мл' },
      categories: [
        { slug: 'parfyumi', name: 'Парфюми', position: 2 },
        { slug: 'za-nea', name: 'За нея', position: 1 },
      ],
      variants: [
        { name: '100 мл', price: 59.9, position: 2 },
        { name: '30 мл', price: 29.9, position: 0 },
        { name: '50 мл', price: 39.9, position: 1 },
      ],
      images: [{ path: 'p/b' }, { path: 'p/a' }],
    })

    const product = await getProductBySlug('rose')

    expect(product).not.toBeNull()
    expect(product!.variants.map((v) => v.name)).toEqual(['30 мл', '50 мл', '100 мл'])
    expect(product!.variants[0]).toMatchObject({ price: 29.9, compareAtPrice: null, stock: null, sku: '', imagePath: null, position: 0 })
    expect(product!.categories.map((c) => c.slug)).toEqual(['za-nea', 'parfyumi'])
    expect(product!.categories[0]).toMatchObject({ name: 'За нея', position: 1 })
    expect(product!.categorySlugs).toEqual(['za-nea', 'parfyumi'])
    expect(product!.images.map((i) => i.path)).toEqual(['p/b', 'p/a'])
    expect(product).toMatchObject({
      slug: 'rose',
      title: 'Rose',
      brand: 'Tiarra',
      gender: 'female',
      optionName: 'Обем',
      perfume: { top: 'bergamot', volume: '50 мл' },
      legacyId: null,
      seoTitle: null,
      seoDescription: null,
      descriptionHtml: '',
    })
  })

  // Ruling R15 for a product's own categories: breadcrumbs, BreadcrumbList and categorySlugs[0]
  // start from the first one, so it must be the same category the shop's category list shows first.
  it('lists a product\'s categories in the order of getCategories (position, legacy id, name)', async () => {
    await insertTestProduct({
      slug: 'yodeyma',
      categories: [
        { slug: 'тяло-и-аромати', name: 'Тяло и аромати', legacyId: 14 },
        { slug: 'parfimes', name: 'Парфюми', legacyId: 11 },
        { slug: 'women', name: 'Дамска', legacyId: 8 },
        { slug: 'new-one', name: 'Нова' },
      ],
    })

    const product = await getProductBySlug('yodeyma')
    const shopOrder = (await getCategories()).map((c) => c.slug)

    expect(shopOrder).toEqual(['women', 'parfimes', 'тяло-и-аромати', 'new-one'])
    expect(product!.categories.map((c) => c.slug)).toEqual(shopOrder)
    expect(product!.categorySlugs).toEqual(shopOrder)
    expect((await cardFor('yodeyma')).categorySlugs).toEqual(shopOrder)
  })

  it('returns null for unknown and hidden slugs', async () => {
    await insertTestProduct({ slug: 'secret', isHidden: true })

    expect(await getProductBySlug('secret')).toBeNull()
    expect(await getProductBySlug('missing')).toBeNull()
  })

  it('returns empty lists for a product without variants, images or categories', async () => {
    await insertTestProduct({ slug: 'plain', price: 12.5, stock: 3 })

    const product = await getProductBySlug('plain')

    expect(product).toMatchObject({ variants: [], images: [], categories: [], perfume: null, hasVariants: false })
  })
})

describe('product cards', () => {
  it('card price comes from the cheapest variant', async () => {
    await insertTestProduct({
      slug: 'dior',
      price: 49.9,
      compareAtPrice: 59.9,
      variants: [
        { name: '50 мл', price: 34.9, compareAtPrice: 34.9 },
        { name: '75 мл', price: 34.9 },
        { name: '30 мл', price: 29.9, compareAtPrice: 34.9 },
      ],
    })

    const card = await cardFor('dior')

    expect(card.price).toBe(29.9)
    expect(card.compareAtPrice).toBe(34.9)
    expect(card.hasVariants).toBe(true)
  })

  it('a product without variants uses its own price, compare price and stock', async () => {
    await insertTestProduct({ slug: 'solo', price: 18.5, compareAtPrice: 22, stock: 0 })
    await insertTestProduct({ slug: 'untracked', price: 9.9, stock: null })

    expect(await cardFor('solo')).toMatchObject({ price: 18.5, compareAtPrice: 22, hasVariants: false, inStock: false })
    expect(await cardFor('untracked')).toMatchObject({ price: 9.9, compareAtPrice: null, hasVariants: false, inStock: true })
  })

  it('inStock is true when one variant has stock and another has 0', async () => {
    await insertTestProduct({
      slug: 'mixed',
      stock: 0,
      variants: [
        { name: '30 мл', price: 29.9, stock: 0 },
        { name: '50 мл', price: 39.9, stock: 4 },
      ],
    })

    expect((await cardFor('mixed')).inStock).toBe(true)
  })

  it('inStock is false when every variant is sold out, and true when stock is not tracked', async () => {
    await insertTestProduct({
      slug: 'gone',
      stock: 10,
      variants: [
        { name: '30 мл', price: 29.9, stock: 0 },
        { name: '50 мл', price: 39.9, stock: 0 },
      ],
    })
    await insertTestProduct({
      slug: 'untracked-variant',
      variants: [
        { name: '30 мл', price: 29.9, stock: 0 },
        { name: '50 мл', price: 39.9, stock: null },
      ],
    })

    expect((await cardFor('gone')).inStock).toBe(false)
    expect((await cardFor('untracked-variant')).inStock).toBe(true)
  })

  it('imagePath is the image at position 0, and null without images', async () => {
    await insertTestProduct({ slug: 'pictured', images: [{ path: 'p/first' }, { path: 'p/second' }] })
    await insertTestProduct({ slug: 'bare' })

    expect((await cardFor('pictured')).imagePath).toBe('p/first')
    expect((await cardFor('bare')).imagePath).toBeNull()
  })

  it('cards are newest first and carry their category slugs and ISO creation date', async () => {
    await insertTestProduct({ slug: 'old', createdAt: '2026-01-01T10:00:00.000Z' })
    await insertTestProduct({
      slug: 'new',
      createdAt: '2026-03-01T10:00:00.000Z',
      categories: [{ slug: 'b', position: 2 }, { slug: 'a', position: 1 }],
    })
    await insertTestProduct({ slug: 'newer-b', createdAt: '2026-04-01T10:00:00.000Z' })
    await insertTestProduct({ slug: 'newer-a', createdAt: '2026-04-01T10:00:00.000Z' })

    const cards = await getProductCards()

    expect(cards.map((c) => c.slug)).toEqual(['newer-a', 'newer-b', 'new', 'old'])
    expect(cards.find((c) => c.slug === 'new')).toMatchObject({
      categorySlugs: ['a', 'b'],
      createdAt: '2026-03-01T10:00:00.000Z',
    })
  })

  it('filters cards by category slug', async () => {
    await insertTestProduct({ slug: 'in-care', categories: [{ slug: 'care' }, { slug: 'other' }] })
    await insertTestProduct({ slug: 'in-other', categories: [{ slug: 'other' }] })
    await insertTestProduct({ slug: 'in-none' })

    const cards = await getProductCards({ categorySlug: 'care' })

    expect(cards.map((c) => c.slug)).toEqual(['in-care'])
    expect(await getProductCards({ categorySlug: 'nope' })).toEqual([])
  })

  it('hidden products are excluded from cards and slugs', async () => {
    await insertTestProduct({ slug: 'shown', categories: [{ slug: 'care' }] })
    await insertTestProduct({ slug: 'hidden', isHidden: true, categories: [{ slug: 'care' }] })

    expect((await getProductCards()).map((c) => c.slug)).toEqual(['shown'])
    expect((await getProductCards({ categorySlug: 'care' })).map((c) => c.slug)).toEqual(['shown'])
    expect(await getAllProductSlugs()).toEqual(['shown'])
  })

  it('onSale returns only products whose compareAtPrice is above the price', async () => {
    await insertTestProduct({ slug: 'plain', price: 20 })
    await insertTestProduct({ slug: 'discounted', price: 20, compareAtPrice: 25 })
    // An old price that is not above the price is not a sale (ruling R7).
    await insertTestProduct({ slug: 'same-compare', price: 20, compareAtPrice: 20 })
    await insertTestProduct({ slug: 'lower-compare', price: 20, compareAtPrice: 15 })
    await insertTestProduct({
      slug: 'variant-sale',
      price: 40,
      variants: [
        { name: '30 мл', price: 29.9, compareAtPrice: 34.9 },
        { name: '50 мл', price: 39.9 },
      ],
    })
    await insertTestProduct({
      // The cheapest variant has no compare price, so the card is not on sale
      // even though the product row itself carries one.
      slug: 'cheap-variant-plain',
      price: 40,
      compareAtPrice: 50,
      variants: [
        { name: '30 мл', price: 19.9 },
        { name: '50 мл', price: 39.9, compareAtPrice: 49.9 },
      ],
    })

    const cards = await getProductCards({ onSale: true })

    expect(cards.map((c) => c.slug).sort()).toEqual(['discounted', 'variant-sale'])
    expect(cards.every((c) => c.compareAtPrice !== null && c.compareAtPrice > c.price)).toBe(true)
  })
})

describe('getRelatedProducts', () => {
  it('excludes self and the opposite gender', async () => {
    const shared = [{ slug: 'parfyumi' }]
    await insertTestProduct({ slug: 'she', gender: 'female', categories: shared })
    await insertTestProduct({ slug: 'she-too', gender: 'female', categories: shared })
    await insertTestProduct({ slug: 'both', gender: 'unisex', categories: shared })
    await insertTestProduct({ slug: 'he', gender: 'male', categories: shared })

    const product = (await getProductBySlug('she'))!
    const related = await getRelatedProducts(product, 10)

    expect(related.map((c) => c.slug).sort()).toEqual(['both', 'she-too'])
  })

  it('shows every gender next to a unisex product', async () => {
    const shared = [{ slug: 'parfyumi' }]
    await insertTestProduct({ slug: 'both', gender: 'unisex', categories: shared })
    await insertTestProduct({ slug: 'she', gender: 'female', categories: shared })
    await insertTestProduct({ slug: 'he', gender: 'male', categories: shared })

    const related = await getRelatedProducts((await getProductBySlug('both'))!, 10)

    expect(related.map((c) => c.slug).sort()).toEqual(['he', 'she'])
  })

  it('requires a shared category and skips hidden products', async () => {
    await insertTestProduct({ slug: 'base', categories: [{ slug: 'a' }, { slug: 'b' }] })
    await insertTestProduct({ slug: 'shares-b', categories: [{ slug: 'b' }, { slug: 'c' }] })
    await insertTestProduct({ slug: 'elsewhere', categories: [{ slug: 'c' }] })
    await insertTestProduct({ slug: 'uncategorised' })
    await insertTestProduct({ slug: 'hidden-match', isHidden: true, categories: [{ slug: 'a' }] })

    const related = await getRelatedProducts((await getProductBySlug('base'))!, 10)

    expect(related.map((c) => c.slug)).toEqual(['shares-b'])
  })

  it('returns the newest matches first and applies the limit after filtering', async () => {
    const shared = [{ slug: 'care' }]
    await insertTestProduct({ slug: 'base', gender: 'female', categories: shared, createdAt: '2026-01-01T00:00:00Z' })
    await insertTestProduct({ slug: 'wrong-gender', gender: 'male', categories: shared, createdAt: '2026-06-01T00:00:00Z' })
    await insertTestProduct({ slug: 'newest', gender: 'female', categories: shared, createdAt: '2026-05-01T00:00:00Z' })
    await insertTestProduct({ slug: 'middle', gender: 'unisex', categories: shared, createdAt: '2026-04-01T00:00:00Z' })
    await insertTestProduct({ slug: 'oldest', gender: 'female', categories: shared, createdAt: '2026-03-01T00:00:00Z' })

    const related = await getRelatedProducts((await getProductBySlug('base'))!, 2)

    expect(related.map((c) => c.slug)).toEqual(['newest', 'middle'])
  })
})

describe('categories and slugs', () => {
  it('getCategories orders by position', async () => {
    await insertTestProduct({
      slug: 'p',
      categories: [
        { slug: 'third', position: 3 },
        { slug: 'first', name: 'Първа', position: 1 },
        { slug: 'second', position: 2 },
      ],
    })

    const categories = await getCategories()

    expect(categories.map((c) => c.slug)).toEqual(['first', 'second', 'third'])
    expect(categories[0]).toEqual({ id: expect.any(String), slug: 'first', name: 'Първа', position: 1 })
  })

  // Ruling R15: the import gives every category position 0, so the order of the live shop
  // (its legacy ids) has to decide. A category without a legacy id comes after those, by name.
  it('getCategories orders categories of equal position by legacy id, then by name', async () => {
    await insertTestProduct({
      slug: 'p',
      categories: [
        { slug: 'beard', name: 'Брада', legacyId: 15 },
        { slug: 'women', name: 'Дамска', legacyId: 8 },
        { slug: 'zzz-new', name: 'Яка нова' },
        { slug: 'care', name: 'Грижа', legacyId: 13 },
        { slug: 'aaa-new', name: 'Аа нова' },
        { slug: 'men', name: 'Мъжка', legacyId: 9 },
        { slug: 'pinned', name: 'Закачена', position: -1, legacyId: 99 },
      ],
    })

    expect((await getCategories()).map((c) => c.slug)).toEqual(['pinned', 'women', 'men', 'care', 'beard', 'aaa-new', 'zzz-new'])
  })

  it('getCategoryBySlug finds a category or returns null', async () => {
    await insertTestProduct({ slug: 'p', categories: [{ slug: 'грижа-за-коса', name: 'Грижа за коса', position: 4 }] })

    expect(await getCategoryBySlug('грижа-за-коса')).toMatchObject({ slug: 'грижа-за-коса', name: 'Грижа за коса', position: 4 })
    expect(await getCategoryBySlug('missing')).toBeNull()
  })

  it('getProductSitemapEntries lists every visible product with the time it last changed', async () => {
    await insertTestProduct({ slug: 'b-product' })
    await insertTestProduct({ slug: 'a-product' })
    await insertTestProduct({ slug: 'hidden-product', isHidden: true })
    await sql`update store.products set updated_at = '2026-10-01T10:00:00Z' where slug = 'a-product'`

    const entries = await getProductSitemapEntries()

    expect(entries.map((e) => e.slug)).toEqual(['a-product', 'b-product'])
    expect(entries[0].updatedAt).toEqual(new Date('2026-10-01T10:00:00Z'))
    expect(entries[1].updatedAt).toBeInstanceOf(Date)
  })

  it('getAllProductSlugs lists every visible slug', async () => {
    await insertTestProduct({ slug: 'b-product' })
    await insertTestProduct({ slug: 'a-product' })

    expect(await getAllProductSlugs()).toEqual(['a-product', 'b-product'])
  })
})
