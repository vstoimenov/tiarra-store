import { describe, expect, it } from 'vitest'
import { catalogNotesByFamily, displayMatchPercent, isWearablePerfume, matchingFamilies, noteMatchPercent, preferenceFactor, recommendFallbackPerfumes, recommendPerfumes, recommendRelatedPerfumes, type QuizProduct } from '@/lib/quiz/perfume'

function product(overrides: Partial<QuizProduct>): QuizProduct {
  return { id: 'product-1', slug: 'perfume', title: 'Парфюм', brand: null, gender: 'female', imagePath: null, price: 20, compareAtPrice: null, hasVariants: false, inStock: true, categorySlugs: ['parfimes'], createdAt: '2026-01-01', perfume: null, ...overrides }
}

describe('perfume finder', () => {
  it('displays scores above 75 on the disclosed scale without changing their order', () => {
    expect([0, 12, 50, 80, 100].map(displayMatchPercent)).toEqual([76, 79, 88, 95, 100])
    expect(displayMatchPercent(-20)).toBe(76)
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
  it('recognizes the Bulgarian note names from the official YODEYMA catalog', () => {
    expect(matchingFamilies({top:'Цитрон',heart:'Нероли',base:'Черен чай'})).toEqual(['floral','fresh'])
    expect(matchingFamilies({top:'Агарово дърво (уд)',heart:'Пачули',base:'Лавандула'})).toEqual(['floral','woody'])
    expect(matchingFamilies({top:'Липа',base:'Акигалавуд, кашмир, дъбов абсолю'})).toEqual(['floral','woody'])
    expect(matchingFamilies({heart:'Босилек, ревен',base:'Водна нотка'})).toEqual(['fresh'])
    expect(matchingFamilies({base:'Смирна'})).toEqual(['spicy'])
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
    expect(preferenceFactor(null, preferences)).toBe(1)
    expect(noteMatchPercent(suitable, ['floral'], preferences)).toBeGreaterThanOrEqual(noteMatchPercent(noTraits, ['floral'], preferences)!)
    expect(noteMatchPercent(unsuitable, ['floral'], preferences)).toBeLessThan(noteMatchPercent(suitable, ['floral'], preferences)!)
    const ranked = recommendPerfumes([product({ slug:'unsuitable', perfume:unsuitable }), product({ slug:'suitable', perfume:suitable })], { gender:'any', families:['floral'], maxPrice:null, ...preferences })
    expect(ranked.map(item => item.slug)).toEqual(['suitable', 'unsuitable'])
    expect(preferenceFactor({ occasion:'both' }, { occasion:'daily' })).toBe(1)
  })
  it('uses notes as a modest guide to occasion and intensity when explicit traits are absent', () => {
    const fresh = { top: 'бергамот' }
    const spicy = { base: 'тамян' }
    const dailyLight = { occasion: 'daily' as const, intensity: 'light' as const }
    const eveningStrong = { occasion: 'special' as const, intensity: 'strong' as const }
    expect(preferenceFactor(fresh, dailyLight)).toBeGreaterThan(preferenceFactor(spicy, dailyLight))
    expect(preferenceFactor(spicy, eveningStrong)).toBeGreaterThan(preferenceFactor(fresh, eveningStrong))
    expect(preferenceFactor(null, dailyLight, ['бергамот'])).toBeGreaterThan(preferenceFactor(null, dailyLight, ['тамян']))
    expect(preferenceFactor({ ...spicy, occasion:'daily', intensity:'light' }, dailyLight)).toBe(1)
    expect(preferenceFactor(null, dailyLight)).toBe(1)
  })
  it('builds note choices only from matching available perfumes, including their descriptions', () => {
    const products = [product({slug:'a', gender:'female', perfume:{top:'Роза, ванилия'}, descriptionNotes:['дървета']}), product({slug:'b', gender:'unisex', perfume:{heart:'роза'}}), product({slug:'male',gender:'male',perfume:{top:'лимон'}}), product({slug:'sold',inStock:false,perfume:{top:'касис'}}), product({slug:'case',title:'Кейс за парфюм',perfume:{top:'лимон'}})]
    const choices = catalogNotesByFamily(products, 'female')
    expect(choices.floral).toEqual([{value:'роза',count:2}])
    expect(choices.woody).toEqual([{value:'дървета',count:1}])
    expect(choices.fresh).toEqual([])
    expect(choices.fruity).toEqual([])
  })
  it('uses an optional specific note in the match score and supports description notes', () => {
    const a = product({slug:'a',perfume:{top:'малина, круша'}})
    const b = product({slug:'b',perfume:{top:'круша'}})
    const answer = {gender:'any' as const, families:['fruity' as const], notes:['малина'], maxPrice:null}
    expect(recommendPerfumes([b,a], answer).map(item=>item.slug)).toEqual(['a','b'])
    expect(noteMatchPercent(null, ['floral'], {notes:['рози']}, ['рози'])).toBeGreaterThan(0)
  })
  it('fills limited results without duplicates, unavailable items, accessories or wrong-gender products', () => {
    const products = [
      product({id:'direct',slug:'direct',perfume:{top:'роза'}}),
      product({id:'near',slug:'near',perfume:{top:'малина'}}),
      product({id:'suitable',slug:'suitable',perfume:{occasion:'daily',intensity:'light'}}),
      product({id:'unknown',slug:'unknown',perfume:null}),
      product({id:'sold',slug:'sold',inStock:false}),
      product({id:'accessory',slug:'case',title:'Кейс за парфюм'}),
      product({id:'wrong',slug:'wrong',gender:'male'}),
    ]
    const answer = { gender:'female' as const, families:['floral' as const], maxPrice:null, occasion:'daily' as const, intensity:'light' as const }
    const fallback = recommendFallbackPerfumes(products, answer, ['direct','near'])
    expect(fallback.map(item=>item.id)).toEqual(['suitable','unknown'])
  })
  it('can suggest eligible perfumes even when no fragrance notes are classified', () => {
    const products = [product({id:'a',slug:'a',perfume:null}), product({id:'b',slug:'b',perfume:null})]
    expect(recommendFallbackPerfumes(products, {gender:'any',families:[],maxPrice:null}, []).map(item=>item.id)).toEqual(['a','b'])
  })
})
