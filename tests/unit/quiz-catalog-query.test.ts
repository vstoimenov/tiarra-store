import { describe, expect, it, vi } from 'vitest'
const rows = vi.hoisted(() => ({ value: [] as unknown[] }))
vi.mock('@/lib/db', () => ({ sql: (parts: TemplateStringsArray) => parts.join('').includes('available_variant.price as available_price') ? Promise.resolve(rows.value) : {} }))
import { getPerfumeQuizProducts } from '@/lib/catalog/queries'

describe('perfume quiz catalog', () => {
  it('uses the cheapest available variant for its displayed price and budget', async () => {
    rows.value = [{ slug:'scent', title:'Парфюм', brand:null, gender:'female', created_at:new Date('2026-01-01'), stock:null, image_path:null, price:12, compare_at_price:20, variant_stocks:[0,5], category_slugs:['parfimes'], id:'p', perfume:null, available_price:25, available_compare_at_price:30 }]
    const [card] = await getPerfumeQuizProducts()
    expect(card.inStock).toBe(true)
    expect(card.hasVariants).toBe(true)
    expect(card.price).toBe(25)
    expect(card.compareAtPrice).toBe(30)
  })
  it('does not substitute a variant price for a product without variants', async () => {
    rows.value = [{ slug:'scent', title:'Парфюм', brand:null, gender:'female', created_at:new Date('2026-01-01'), stock:2, image_path:null, price:20, compare_at_price:null, variant_stocks:null, category_slugs:['parfimes'], id:'p', perfume:null, available_price:null, available_compare_at_price:null }]
    const [card] = await getPerfumeQuizProducts()
    expect(card.price).toBe(20)
    expect(card.hasVariants).toBe(false)
  })
  it('uses explicit product description notes but excludes shared split-variant descriptions', async () => {
    const base = { slug:'scent', title:'Парфюм', brand:null, gender:'female', created_at:new Date('2026-01-01'), stock:2, image_path:null, price:20, compare_at_price:null, variant_stocks:null, category_slugs:['parfimes'], id:'p', available_price:null, available_compare_at_price:null, quiz_description:'<p>Ориенталски нотки на ценни дървета и елегантни нотки на рози, скрити в оазиса.</p>' }
    rows.value = [{ ...base, perfume:{volume:'50 мл'} }, { ...base, slug:'other', perfume:{variant:'OTHER'} }, { ...base, slug:'specific', perfume:{variant:'OTHER'}, quiz_description:'<p>OTHER</p><p>Връхни нотки: Роза</p><p>Базови нотки: Ванилия</p>' }]
    const [own, shared, specific] = await getPerfumeQuizProducts()
    expect(own.descriptionNotes).toEqual(['дървета', 'рози'])
    expect(shared.descriptionNotes).toEqual([])
    expect(specific.perfume?.top).toBe('Роза')
    expect(specific.perfume?.base).toBe('Ванилия')
  })
})
