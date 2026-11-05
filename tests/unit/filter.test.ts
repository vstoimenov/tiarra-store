import { describe, expect, it } from 'vitest'
import { brandsOf, filterProducts } from '@/lib/catalog/filter'
import type { ProductCard } from '@/lib/catalog/types'

function card(slug: string, over: Partial<ProductCard> = {}): ProductCard {
  return {
    slug,
    title: slug,
    brand: null,
    gender: 'unisex',
    imagePath: null,
    price: 10,
    compareAtPrice: null,
    hasVariants: false,
    inStock: true,
    categorySlugs: [],
    createdAt: '2026-10-01T00:00:00.000Z',
    ...over,
  }
}

const slugs = (list: ProductCard[]) => list.map((c) => c.slug)

// Deliberately not in date or price order, so a filter that forgets to sort is caught.
const reuzel = card('reuzel-pomade', {
  title: 'Reuzel Extreme Hold Matte Pomade 35 ml',
  brand: 'REUZEL',
  price: 12,
  createdAt: '2026-10-02T00:00:00.000Z',
})
const crew = card('crew-pomada', {
  title: 'American Crew Помада за коса 85 ml',
  brand: 'AMERICAN CREW',
  price: 20,
  compareAtPrice: 25,
  createdAt: '2026-10-04T00:00:00.000Z',
})
const yodeyma = card('yodeyma-her', {
  title: 'YODEYMA Paris EDP For Her 100 ml',
  brand: 'YODEYMA',
  price: 29.9,
  compareAtPrice: 34.9,
  createdAt: '2026-10-01T00:00:00.000Z',
})
const nish = card('nish-man', {
  title: 'NISH MAN Парфюм 50 ml',
  brand: 'NISH MAN',
  price: 5,
  compareAtPrice: 10,
  createdAt: '2026-10-03T00:00:00.000Z',
})
const all = [reuzel, crew, yodeyma, nish]

describe('filterProducts', () => {
  it('text search is case-insensitive', () => {
    expect(slugs(filterProducts(all, { text: 'reuzel' }))).toEqual(['reuzel-pomade'])
    expect(slugs(filterProducts(all, { text: 'EXTREME hold' }))).toEqual(['reuzel-pomade'])
  })

  it('Cyrillic search is case-insensitive too', () => {
    expect(slugs(filterProducts(all, { text: 'помада' }))).toEqual(['crew-pomada'])
    expect(slugs(filterProducts(all, { text: 'ПОМАДА' }))).toEqual(['crew-pomada'])
  })

  it('text matches the brand as well as the title', () => {
    const brandOnly = card('b', { title: 'Балсам за брада', brand: 'Barburys' })
    expect(slugs(filterProducts([brandOnly, crew], { text: 'barburys' }))).toEqual(['b'])
  })

  it('every word of the text has to match the title or the brand', () => {
    expect(slugs(filterProducts(all, { text: 'american помада' }))).toEqual(['crew-pomada'])
    expect(filterProducts(all, { text: 'american reuzel' })).toEqual([])
  })

  it('blank text keeps every card', () => {
    expect(filterProducts(all, { text: '   ' })).toHaveLength(4)
    expect(filterProducts(all, {})).toHaveLength(4)
  })

  it('brand filter keeps only that brand', () => {
    expect(slugs(filterProducts(all, { brand: 'YODEYMA' }))).toEqual(['yodeyma-her'])
    expect(filterProducts(all, { brand: 'NO SUCH BRAND' })).toEqual([])
  })

  it('brand and text filters combine', () => {
    expect(slugs(filterProducts(all, { brand: 'REUZEL', text: 'pomade' }))).toEqual(['reuzel-pomade'])
    expect(filterProducts(all, { brand: 'REUZEL', text: 'помада' })).toEqual([])
  })

  it('newest is the default order', () => {
    expect(slugs(filterProducts(all, {}))).toEqual(['crew-pomada', 'nish-man', 'reuzel-pomade', 'yodeyma-her'])
    expect(slugs(filterProducts(all, { sort: 'newest' }))).toEqual(['crew-pomada', 'nish-man', 'reuzel-pomade', 'yodeyma-her'])
  })

  it('price-asc sorts from the cheapest', () => {
    expect(slugs(filterProducts(all, { sort: 'price-asc' }))).toEqual(['nish-man', 'reuzel-pomade', 'crew-pomada', 'yodeyma-her'])
  })

  it('price-desc sorts from the dearest', () => {
    expect(slugs(filterProducts(all, { sort: 'price-desc' }))).toEqual(['yodeyma-her', 'crew-pomada', 'reuzel-pomade', 'nish-man'])
  })

  it('discount sorts by the share of the old price saved and puts no-discount cards last', () => {
    // nish-man saves 50%, crew-pomada 20%, yodeyma-her 14%; reuzel-pomade has no old price.
    expect(slugs(filterProducts(all, { sort: 'discount' }))).toEqual(['nish-man', 'crew-pomada', 'yodeyma-her', 'reuzel-pomade'])
  })

  it('an old price that is not above the price is not a discount', () => {
    const same = card('same', { price: 10, compareAtPrice: 10, createdAt: '2026-10-09T00:00:00.000Z' })
    const lower = card('lower', { price: 10, compareAtPrice: 8, createdAt: '2026-10-08T00:00:00.000Z' })
    expect(slugs(filterProducts([same, lower, nish], { sort: 'discount' }))).toEqual(['nish-man', 'same', 'lower'])
  })

  it('cards that tie on the sort key keep the newest first', () => {
    const a = card('a', { price: 10, createdAt: '2026-10-01T00:00:00.000Z' })
    const b = card('b', { price: 10, createdAt: '2026-10-03T00:00:00.000Z' })
    const c = card('c', { price: 10, createdAt: '2026-10-02T00:00:00.000Z' })
    expect(slugs(filterProducts([a, b, c], { sort: 'price-asc' }))).toEqual(['b', 'c', 'a'])
  })

  it('filters and sorts together', () => {
    // The Cyrillic „а“ is in „Помада“ and „Парфюм“ only (the other two titles are Latin).
    expect(slugs(filterProducts(all, { text: 'а', sort: 'price-asc' }))).toEqual(['nish-man', 'crew-pomada'])
  })

  it('does not change the array it was given', () => {
    const before = slugs(all)
    filterProducts(all, { sort: 'price-asc' })
    expect(slugs(all)).toEqual(before)
  })
})

describe('brandsOf', () => {
  it('lists each brand once, sorted, and leaves out cards without a brand', () => {
    const noBrand = card('none', { brand: null })
    const twin = card('crew-two', { brand: 'AMERICAN CREW' })
    expect(brandsOf([yodeyma, noBrand, reuzel, twin, crew, nish])).toEqual(['AMERICAN CREW', 'NISH MAN', 'REUZEL', 'YODEYMA'])
  })

  it('is empty when no card has a brand', () => {
    expect(brandsOf([card('a'), card('b')])).toEqual([])
  })
})


describe('shopping filters', () => {
  it('combines an inclusive price range with brand and promotion', () => {
    expect(slugs(filterProducts(all, { minPrice: 20, maxPrice: 29.9, onlyDiscounted: true, brand: 'YODEYMA' }))).toEqual(['yodeyma-her'])
    expect(slugs(filterProducts(all, { minPrice: 12, maxPrice: 20 }))).toEqual(['crew-pomada', 'reuzel-pomade'])
    expect(filterProducts(all, { minPrice: 30, maxPrice: 10 })).toEqual([])
    expect(filterProducts(all, { maxPrice: 0 })).toEqual([])
  })

  it('promotions exclude missing, equal and lower old prices', () => {
    expect(slugs(filterProducts([
      card('missing'), card('equal', { compareAtPrice: 10 }),
      card('lower', { compareAtPrice: 9 }), nish,
    ], { onlyDiscounted: true }))).toEqual(['nish-man'])
  })

  it('includes unisex for him/her and shows only unisex when requested', () => {
    const products = [card('him', { gender: 'male' }), card('her', { gender: 'female' }), card('both')]
    expect(slugs(filterProducts(products, { gender: 'male' }))).toEqual(['him', 'both'])
    expect(slugs(filterProducts(products, { gender: 'female' }))).toEqual(['her', 'both'])
    expect(slugs(filterProducts(products, { gender: 'unisex' }))).toEqual(['both'])
  })
})
