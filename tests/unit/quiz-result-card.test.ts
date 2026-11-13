import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QuizResultCard } from '@/components/quiz/QuizResultCard'
import { recommendPerfumes, type QuizProduct } from '@/lib/quiz/perfume'
const product: QuizProduct = { id:'p1',slug:'test',title:'Тест аромат',brand:null,gender:'female',imagePath:null,price:20,compareAtPrice:null,hasVariants:true,inStock:true,categorySlugs:['parfimes'],createdAt:'2026-01-01',perfume:{ top:'Бергамот', base:'Ванилия' } }
describe('quiz result cards', () => {
  it('shows available notes and directs products with variants to selection', () => {
    const html = renderToStaticMarkup(createElement(QuizResultCard, { product, leading: true, matchedLabels: ['Свежи'] }))
    expect(html).toContain('Бергамот'); expect(html).toContain('Ванилия'); expect(html).toContain('Избери вариант')
    expect(html).not.toContain('Добави в количката'); expect(html).not.toContain('Сърце:')
  })
  it('offers direct addition only for products without variants', () => {
    const html = renderToStaticMarkup(createElement(QuizResultCard, { product: {...product,hasVariants:false}, leading:false, matchedLabels:[] }))
    expect(html).toContain('Добави в количката')
  })
  it('renders the accessible target on the 75–100 display scale', () => {
    const html = renderToStaticMarkup(createElement(QuizResultCard, { product, leading:false, matchedLabels:[], percent:12 }))
    expect(html).toContain('aria-valuemin="75"')
    expect(html).toContain('aria-valuenow="78"')
    expect(html).toContain('75% съвпадение')
  })
  it('keeps further matches for show-more', () => {
    const products = Array.from({length:8},(_, i) => ({...product, slug:`test-${i}`}))
    expect(recommendPerfumes(products,{ gender:'any', families:[], maxPrice:null })).toHaveLength(8)
  })
})
