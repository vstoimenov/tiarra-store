import { describe, expect, it } from 'vitest'
import type { ProductCard } from '@/lib/catalog/types'
import { cardsForSection } from '@/lib/sections/products-source'
import type { SectionOf } from '@/lib/sections/schema'

type ProductsData = SectionOf<'products'>['data']

function card(slug: string, over: Partial<ProductCard> = {}): ProductCard {
  return {
    slug,
    title: slug.toUpperCase(),
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

function data(over: Partial<ProductsData>): ProductsData {
  return { title: '', subtitle: '', source: 'all', limit: 100, ...over }
}

// Deliberately not in date order, so a source that forgets to sort is caught.
const cards = [
  card('b-mid', { createdAt: '2026-10-02T00:00:00.000Z', categorySlugs: ['komplekt'] }),
  card('a-old', { createdAt: '2026-10-01T00:00:00.000Z', price: 20, compareAtPrice: 25, categorySlugs: ['parfimes'] }),
  card('c-new', { createdAt: '2026-10-03T00:00:00.000Z', price: 30, compareAtPrice: 30 }),
  card('d-newest', { createdAt: '2026-10-04T00:00:00.000Z', price: 5, compareAtPrice: 9, categorySlugs: ['komplekt', 'parfimes'] }),
]
const slugs = (list: ProductCard[]) => list.map((c) => c.slug)

describe('cardsForSection', () => {
  it('all lists the newest cards first', () => {
    expect(slugs(cardsForSection(data({ source: 'all' }), cards))).toEqual(['d-newest', 'c-new', 'b-mid', 'a-old'])
  })

  it('newest lists the newest cards first', () => {
    expect(slugs(cardsForSection(data({ source: 'newest' }), cards))).toEqual(['d-newest', 'c-new', 'b-mid', 'a-old'])
  })

  it('mixed alternates catalog groups instead of filling the first screen with one category', () => {
    const mixed = [
      card('women-new', { createdAt: '2026-10-05T00:00:00.000Z', categorySlugs: ['women'] }),
      card('women-old', { createdAt: '2026-10-01T00:00:00.000Z', categorySlugs: ['women'] }),
      card('men-new', { createdAt: '2026-10-04T00:00:00.000Z', categorySlugs: ['men'] }),
      card('perfume-new', { createdAt: '2026-10-03T00:00:00.000Z', categorySlugs: ['parfimes'] }),
      card('kit-new', { createdAt: '2026-10-02T00:00:00.000Z', categorySlugs: ['komplekt'] }),
    ]
    expect(slugs(cardsForSection(data({ source: 'mixed' }), mixed))).toEqual([
      'women-new', 'men-new', 'perfume-new', 'kit-new', 'women-old',
    ])
  })

  it('does not reorder the array it was given', () => {
    const before = slugs(cards)
    cardsForSection(data({ source: 'all' }), cards)
    expect(slugs(cards)).toEqual(before)
  })

  it('category keeps only cards in that category', () => {
    const result = cardsForSection(data({ source: 'category', categorySlug: 'parfimes' }), cards)
    expect(slugs(result)).toEqual(['d-newest', 'a-old'])
  })

  it('onSale keeps only cards whose old price is above the price', () => {
    // c-new has compareAtPrice equal to its price: that is not a discount (ruling R7).
    expect(slugs(cardsForSection(data({ source: 'onSale' }), cards))).toEqual(['d-newest', 'a-old'])
  })

  it('manual keeps the order of the slugs and skips slugs that do not exist', () => {
    const result = cardsForSection(data({ source: 'manual', slugs: ['a-old', 'gone', 'd-newest', 'b-mid'] }), cards)
    expect(slugs(result)).toEqual(['a-old', 'd-newest', 'b-mid'])
  })

  it('limit cuts the result', () => {
    expect(slugs(cardsForSection(data({ source: 'all', limit: 2 }), cards))).toEqual(['d-newest', 'c-new'])
    expect(slugs(cardsForSection(data({ source: 'manual', slugs: ['a-old', 'b-mid', 'c-new'], limit: 2 }), cards))).toEqual([
      'a-old',
      'b-mid',
    ])
  })

  it('a category nobody is in gives an empty list', () => {
    expect(cardsForSection(data({ source: 'category', categorySlug: 'nope' }), cards)).toEqual([])
  })
})
