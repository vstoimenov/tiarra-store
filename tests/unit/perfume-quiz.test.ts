import { describe, expect, it } from 'vitest'
import { matchingFamilies, recommendPerfumes, type QuizProduct } from '@/lib/quiz/perfume'

function product(overrides: Partial<QuizProduct>): QuizProduct {
  return { id: 'product-1', slug: 'perfume', title: 'Парфюм', brand: null, gender: 'female', imagePath: null, price: 20, compareAtPrice: null, hasVariants: false, inStock: true, categorySlugs: ['parfimes'], createdAt: '2026-01-01', perfume: null, ...overrides }
}

describe('perfume finder', () => {
  it('classifies only actual structured notes, including Bulgarian and English', () => {
    expect(matchingFamilies({ top: 'Бергамот, малина', heart: 'жасмин', base: 'vanilla, sandalwood' })).toEqual(['fruity', 'floral', 'fresh', 'sweet', 'woody'])
    expect(matchingFamilies(null)).toEqual([])
    expect(matchingFamilies({ top: 'грозде' })).not.toContain('floral')
  })
  it('ranks matching notes and excludes hidden-by-stock, gender, budget and unknown notes', () => {
    const products = [
      product({ slug: 'one', perfume: { top: 'роза' } }),
      product({ slug: 'both', perfume: { top: 'роза, ванилия' }, gender: 'unisex' }),
      product({ slug: 'no-notes' }),
      product({ slug: 'sold', inStock: false, perfume: { top: 'роза' } }),
      product({ slug: 'expensive', price: 60, perfume: { top: 'роза' } }),
      product({ slug: 'male', gender: 'male', perfume: { top: 'роза' } }),
    ]
    expect(recommendPerfumes(products, { gender: 'female', families: ['floral', 'sweet'], maxPrice: 50 }).map(p => p.slug)).toEqual(['both', 'one'])
  })
  it('does not invent matches and permits unknown notes when no family is selected', () => {
    const products = [product({ slug: 'unknown' })]
    expect(recommendPerfumes(products, { gender: 'any', families: ['fresh'], maxPrice: null })).toEqual([])
    expect(recommendPerfumes(products, { gender: 'any', families: [], maxPrice: null }).map(p => p.slug)).toEqual(['unknown'])
  })
})
