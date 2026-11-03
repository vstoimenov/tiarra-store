import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ProductCard } from '@/components/product/ProductCard'
import type { ProductCard as Card } from '@/lib/catalog/types'

const card: Card = {
  slug: 'one',
  title: 'One',
  brand: null,
  gender: 'unisex',
  imagePath: 'p/abc',
  price: 10,
  compareAtPrice: null,
  hasVariants: false,
  inStock: true,
  categorySlugs: [],
  createdAt: '2026-10-01T00:00:00.000Z',
}

const image = (priority?: boolean) => renderToStaticMarkup(createElement(ProductCard, { card, priority })).match(/<img[^>]*>/)![0]

describe('ProductCard picture', () => {
  it('is lazy by default, so a card far down the page costs nothing', () => {
    expect(image()).toContain('loading="lazy"')
    expect(image()).not.toContain('fetchPriority')
  })

  it('is loaded at once, and asked for first, when the card is on the first row (the LCP candidate)', () => {
    expect(image(true)).toContain('loading="eager"')
    expect(image(true)).toContain('fetchPriority="high"')
  })
})
