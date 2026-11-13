import { describe, expect, it } from 'vitest'
import { displayMatchPercent, isWearablePerfume, matchingFamilies, noteMatchPercent, preferenceFactor, recommendPerfumes, recommendRelatedPerfumes, type QuizProduct } from '@/lib/quiz/perfume'

function product(overrides: Partial<QuizProduct>): QuizProduct {
  return { id: 'product-1', slug: 'perfume', title: 'Парфюм', brand: null, gender: 'female', imagePath: null, price: 20, compareAtPrice: null, hasVariants: false, inStock: true, categorySlugs: ['parfimes'], createdAt: '2026-01-01', perfume: null, ...overrides }
}

describe('perfume finder', () => {
  it('displays scores on the disclosed 75–100 scale without changing their order', () => {
    expect([0, 12, 50, 80, 100].map(displayMatchPercent)).toEqual([75, 78, 88, 95, 100])
    expect(displayMatchPercent(-20)).toBe(75)
    expect(displayMatchPercent(120)).toBe(100)
  })
  it('classifies only actual structured notes, including Bulgarian and English', () => {
    expect(matchingFamilies({ top: 'Бергамот, малина', heart: 'жасмин', base: 'vanilla, sandalwood' })).toEqual(['fruity', 'floral', 'fresh', 'sweet', 'woody'])
    expect(matchingFamilies(null)).toEqual([])
    expect(matchingFamilies({ top: 'грозде' })).not.toContain('floral')
    expect(matchingFamilies({ top: 'розов пипер, Brazilian rosewood' })).toEqual(['spicy', 'woody'])
    expect(matchingFamilies({ heart: 'портокалов цвят' })).toEqual(['floral'])
    expect(matchingFamilies({ heart: 'портокалов цвят и бергамот' })).toEqual(['floral', 'fresh'])
    expect(matchingFamilies({ base: 'какао, горчив бадем' })).toEqual(['sweet'])
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
  it('excludes cases, beard scents and aftershaves even if they are in the perfume category', () => {
    for (const title of ['Кейс за парфюм 15 мл', 'REUZEL Твърд парфюм за брада', 'NISH MAN Aftershave Cologne', 'NISH LADY Body Mist']) {
      expect(isWearablePerfume(product({ title, perfume: { top: 'ванилия' } }))).toBe(false)
    }
    expect(isWearablePerfume(product({ title: 'OLFazeta by CHOGAN 121' }))).toBe(true)
    expect(isWearablePerfume(product({ title: 'YODEYMA Paris EDP 100 ml' }))).toBe(true)
  })
  it('ranks stronger note matches higher and gives preference to matching both selections', () => {
    const products = [product({ slug: 'trace', perfume: { top: 'бергамот, круша', heart: 'жасмин, тубероза', base: 'ванилия' } }),
      product({ slug: 'sweet', perfume: { top: 'карамел', heart: 'мед', base: 'ванилия' } }),
      product({ slug: 'both', perfume: { top: 'малина', heart: 'роза', base: 'ванилия' } })]
    expect(recommendPerfumes(products, { gender: 'any', families: ['sweet'], maxPrice: null }).map(p => p.slug)).toEqual(['sweet', 'both', 'trace'])
    expect(recommendPerfumes(products, { gender: 'any', families: ['sweet', 'fruity'], maxPrice: null })[0].slug).toBe('both')
  })
  it('computes bounded, explainable percentages only when selected notes actually match', () => {
    const perfume = { top: 'круша, бергамот', heart: 'роза, жасмин', base: 'ванилия' }
    const one = noteMatchPercent(perfume, ['floral'])!
    const two = noteMatchPercent(perfume, ['floral', 'sweet'])!
    const partial = noteMatchPercent(perfume, ['floral', 'spicy'])!
    expect(one).toBeGreaterThan(50); expect(one).toBeLessThanOrEqual(100)
    expect(two).toBeGreaterThan(partial)
    expect(noteMatchPercent(perfume, ['spicy'])).toBeNull()
    expect(noteMatchPercent(perfume, [])).toBeNull()
    expect(noteMatchPercent(null, ['floral'])).toBeNull()
  })
  it('offers only scored nearby alternatives with notes, without duplicating direct matches', () => {
    const products = [
      product({ slug: 'direct', perfume: { top: 'малина' } }),
      product({ slug: 'near', perfume: { heart: 'роза' } }),
      product({ slug: 'unknown', perfume: null }),
      product({ slug: 'sold', inStock: false, perfume: { top: 'бергамот' } }),
      product({ slug: 'wrong-gender', gender: 'male', perfume: { top: 'бергамот' } }),
    ]
    const choices = { gender: 'female' as const, families: ['fruity' as const], maxPrice: null }
    const nearby = recommendRelatedPerfumes(products, choices)
    expect(nearby.map(item => item.product.slug)).toEqual(['near'])
    expect(nearby[0].percent).toBeGreaterThan(0)
    expect(nearby[0].percent).toBeLessThan(50)
    expect(recommendRelatedPerfumes(products, { ...choices, families: [] })).toEqual([])
  })
  it('uses entered occasion and intensity without inventing missing attributes', () => {
    const preferences = { occasion: 'daily' as const, intensity: 'light' as const }
    const noTraits = { top: 'роза' }
    const suitable = { top: 'роза', occasion: 'daily' as const, intensity: 'light' as const }
    const unsuitable = { top: 'роза', occasion: 'special' as const, intensity: 'strong' as const }
    expect(preferenceFactor(noTraits, preferences)).toBe(1)
    expect(noteMatchPercent(suitable, ['floral'], preferences)).toBe(noteMatchPercent(noTraits, ['floral'], preferences))
    expect(noteMatchPercent(unsuitable, ['floral'], preferences)).toBeLessThan(noteMatchPercent(suitable, ['floral'], preferences)!)
    const ranked = recommendPerfumes([product({ slug:'unsuitable', perfume:unsuitable }), product({ slug:'suitable', perfume:suitable })], { gender:'any', families:['floral'], maxPrice:null, ...preferences })
    expect(ranked.map(item => item.slug)).toEqual(['suitable', 'unsuitable'])
    expect(preferenceFactor({ occasion:'both' }, { occasion:'daily' })).toBe(1)
  })
})
