import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { KitsCollection } from '@/components/sections/KitsCollection'
import type { ProductCard } from '@/lib/catalog/types'
import type { SectionOf } from '@/lib/sections/schema'

const section: SectionOf<'products'> = { id:'kits',type:'products',enabled:true,data:{title:'',subtitle:'',source:'manual',slugs:['kit-one'],limit:8} }
const card: ProductCard = { slug:'kit-one',title:'Комплект за грижа',brand:'TIARRA',gender:'unisex',imagePath:null,price:20,compareAtPrice:25,hasVariants:false,inStock:true,categorySlugs:['komplekt'],createdAt:'2026-01-01' }
describe('kits collection', () => {
  it('shows the curated product, actual price and collection link', () => {
    const html = renderToStaticMarkup(createElement(KitsCollection, { section, cards:[card] }))
    expect(html).toContain('Комплекти за всеки')
    expect(html).toContain('Комплект за грижа')
    expect(html).toContain('20,00 €')
    expect(html).toContain('25,00 €')
    expect(html).toContain('/store/category/komplekt')
  })
  it('keeps the section editable and does not display an empty carousel', () => {
    const custom = { ...section, data:{ ...section.data, title:'Моите комплекти',subtitle:'Подаръци' } }
    expect(renderToStaticMarkup(createElement(KitsCollection, { section:custom, cards:[card] }))).toContain('Моите комплекти')
    expect(renderToStaticMarkup(createElement(KitsCollection, { section, cards:[] }))).toBe('')
  })
})
