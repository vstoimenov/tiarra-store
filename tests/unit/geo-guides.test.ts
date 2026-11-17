import {describe,it,expect} from 'vitest'
import {guideProducts,deliveryAnswer,guideFaq,isGuideSlug} from '@/lib/geo/guides'
import type {ProductCard} from '@/lib/catalog/types'
import type {CommerceSettings} from '@/lib/commerce-settings-schema'
const card=(extra:Partial<ProductCard>):ProductCard=>({slug:'one',title:'Парфюм OLFazeta by CHOGAN',brand:'OLFazeta by CHOGAN',gender:'unisex',imagePath:null,price:20,compareAtPrice:null,hasVariants:false,inStock:true,categorySlugs:['parfimes'],createdAt:'2026-01-01',...extra})
const shipping={econtEnabled:true,econtAddressEnabled:true,econtAddressPrice:6,speedyEnabled:true,speedyAddressEnabled:false,speedyAddressPrice:7,freeShippingThreshold:39,dispatchHours:24,deliveryEstimate:'1–2 работни дни'} as CommerceSettings
describe('factual buying guides',()=>{
 it('keeps available Chogan fragrances and excludes cases and unavailable products',()=>{
  const perfume=card({})
  expect(guideProducts('olfazeta-chogan-dostavka',[card({title:'OLFazeta Кейс за парфюм'}),card({inStock:false}),card({brand:'YODEYMA'}),perfume])).toEqual([perfume])
 })
 it('uses real budget and availability for beard gifts',()=>{
  const gift=card({title:'REUZEL комплект за брада',categorySlugs:['komplekt'],price:49.99})
  expect(guideProducts('podarak-za-mazh-s-brada-do-50-euro',[gift,{...gift,price:50.01},{...gift,inStock:false},{...gift,categorySlugs:[]}])).toEqual([gift])
 })
 it('reflects disabled address delivery and does not advertise disabled couriers',()=>{
  expect(deliveryAnswer(shipping)).toContain('Еконт')
  expect(deliveryAnswer(shipping)).not.toContain('Спиди')
  expect(deliveryAnswer({...shipping,econtAddressEnabled:false})).toContain('не е активна')
  const faq=guideFaq('olfazeta-chogan-dostavka',shipping,[card({})])
  expect(faq.find(f=>f.q==='Колко струва доставката?')?.a).toContain('6,00 € с Еконт')
  expect(faq.find(f=>f.q==='Колко струва доставката?')?.a).not.toContain('7,00')
  expect(guideFaq('olfazeta-chogan-dostavka',{...shipping,freeShippingThreshold:0},[])[2].a).toContain('Безплатна доставка с Еконт и Спиди')
 })
 it('handles empty selections without inventing prices or products',()=>{
  expect(guideFaq('nish-lady-komplekti-za-kosa',shipping,[])[1].a).toContain('няма налични')
  expect(isGuideSlug('unknown')).toBe(false)
 })
})
