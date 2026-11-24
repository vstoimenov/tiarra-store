import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { isChogan15MlCase, isChoganPerfume, PRODUCT_BUMP_LABEL } from '@/lib/catalog/bump-rules'
import { ProductBump } from '@/components/product/ProductBump'
import { productFromFixture } from './helpers/product-fixture'

it.each(['OLFazeta by CHOGAN 164 — UNFOLD Extract de Perfume 30%', 'OLFazeta by CHOGAN - IMPERATRIX Luxury Extract de Perfume 30%', 'Парфюм № 125'])('recognizes a CHOGAN perfume: %s', title => {
  expect(isChoganPerfume({ title, brand: 'OLFazeta by CHOGAN' })).toBe(true)
})
it.each(['OLFazeta Кейс за парфюм 15 мл черен/кафяв', 'OLFazeta Парфюмен крем за тяло', 'OLFazeta Scented Shower Gel', 'CHOGAN Подаръчен комплект', 'SIEM Шампоан'])('does not treat other goods as a perfume: %s', title => {
  expect(isChoganPerfume({ title, brand: 'OLFazeta by CHOGAN' })).toBe(false)
})
it('requires a CHOGAN/OLFazeta case for 15 ml, not another accessory, brand or size', () => {
  expect(isChogan15MlCase({ title: 'OLFazeta Кейс за парфюм 15 мл' })).toBe(true)
  expect(isChogan15MlCase({ title: 'Case 15 ml', brand: 'Chogan' })).toBe(true)
  expect(isChogan15MlCase({ title: 'Друг кейс за парфюм 15 мл', brand: 'Друга марка' })).toBe(false)
  expect(isChogan15MlCase({ title: 'OLFazeta Кейс за парфюм 150 мл' })).toBe(false)
  expect(isChogan15MlCase({ title: 'OLFazeta Парфюм 15 мл' })).toBe(false)
})
it('shows the new heading even with an older saved label, and keeps colour selection for variants', () => {
  const product = productFromFixture('product-yodeyma')
  const markup = renderToStaticMarkup(createElement(ProductBump, { product, label: 'Добави към ритуала си' }))
  expect(markup).toContain(PRODUCT_BUMP_LABEL)
  expect(markup).not.toContain('Добави към ритуала си')
  expect(markup).toContain('Избери')
  expect(markup).not.toContain('+ Добави')
})
