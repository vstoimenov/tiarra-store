import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BuyBox } from '@/components/product/BuyBox'
import { Gallery } from '@/components/product/Gallery'
import { PerfumePyramid, pyramidNotes } from '@/components/product/PerfumePyramid'
import { ProductDetails } from '@/components/product/ProductDetails'
import { TrustBlock } from '@/components/product/TrustBlock'
import { initialVariantId } from '@/lib/catalog/variant'
import { imageUrl } from '@/lib/images'
import { productFromFixture } from './helpers/product-fixture'

// The first render of each component, as the server sends it. The behaviour after a click is in tests/e2e/product.spec.ts.
const html = (element: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(element)

const yodeyma = productFromFixture('product-yodeyma')
const idOf = (name: string) => yodeyma.variants.find((v) => v.name === name)!.id
const buyBox = (variantId: string | null, product = yodeyma) =>
  html(createElement(BuyBox, { product, variantId, onVariantChange: () => {} }))

describe('Gallery', () => {
  it('shows a quiet box, not a broken image, when the product has no pictures', () => {
    const markup = html(createElement(Gallery, { images: [], title: 'Без снимка' }))

    expect(markup).not.toContain('<img')
    expect(markup).toContain('data-testid="no-image"')
  })

  it('opens on the picture of the selected variant', () => {
    const markup = html(createElement(Gallery, { images: yodeyma.images, selectedPath: yodeyma.images[2].path, title: 'x' }))

    expect(markup).toContain(`src="${imageUrl(yodeyma.images[2].path, 800)}"`)
  })

  it('shows a variant picture that is not in the gallery as the main picture, without a thumbnail for it', () => {
    const markup = html(createElement(Gallery, { images: yodeyma.images, selectedPath: 'p/elsewhere', title: 'x' }))

    expect(markup).toContain(`src="${imageUrl('p/elsewhere', 800)}"`)
    const thumbnails = markup.match(/<ul[^>]*data-testid="thumbnails".*?<\/ul>/s)?.[0] ?? ''
    expect(thumbnails).toContain('<img')
    expect(thumbnails).not.toContain('elsewhere')
    expect(markup).toContain('loading="eager"')
    expect(markup).toContain('fetchPriority="high"')
  })

  it('has no thumbnails for a single picture', () => {
    const markup = html(createElement(Gallery, { images: yodeyma.images.slice(0, 1), title: 'x' }))

    expect(markup).not.toContain('data-testid="thumbnails"')
  })
})

describe('BuyBox', () => {
  it('labels the options with the option name and lists every variant', () => {
    const markup = buyBox(initialVariantId(yodeyma))

    expect(markup).toContain('Аромат:')
    for (const variant of yodeyma.variants) expect(markup).toContain(variant.name)
  })

  it('shows the price, old price and percent of the selected variant', () => {
    const markup = buyBox(idOf('BLACK ELIXIR'))

    expect(markup).toContain('29,90 €')
    expect(markup).toContain('34,90 €')
    expect(markup).toContain('-14%')
    expect(markup).toContain('Добави в количката')
  })

  it('shows no old price for a variant that is not on sale', () => {
    const markup = buyBox(idOf('BOREAL'))

    expect(markup).toContain('34,90 €')
    expect(markup).not.toContain('old-price')
    expect(markup).not.toContain('-14%')
  })

  it('reads „Изчерпан“ and disables the button for the variant with stock 0 only', () => {
    const out = buyBox(idOf('LINET'))
    expect(out).toMatch(/<button[^>]*disabled=""[^>]*>Изчерпан<\/button>/)
    expect(out).not.toContain('Добави в количката')

    const fine = buyBox(idOf('LIDO'))
    expect(fine).toMatch(/<button[^>]*>Добави в количката<\/button>/)
    expect(fine).not.toMatch(/<button[^>]*disabled=""[^>]*>Добави в количката<\/button>/)
    // The variants that are out are marked for a screen reader; the others are not.
    expect(fine.match(/\(изчерпан\)/g)).toHaveLength(2) // LINET and OUDE
  })

  it('caps the quantity at the stock of the variant, and at 99 when it is not tracked', () => {
    expect(buyBox(idOf('BLACK ELIXIR'))).toMatch(/aria-label="Количество"[^>]*max="2"/)
    expect(buyBox(idOf('BOREAL'))).toMatch(/aria-label="Количество"[^>]*max="1"/)

    const untracked = yodeyma.variants.map((v) => ({ ...v, stock: null }))
    expect(buyBox(untracked[0].id, { ...yodeyma, variants: untracked })).toMatch(/aria-label="Количество"[^>]*max="99"/)
  })

  it('has no options for a product without variants, and uses its own price and stock', () => {
    const redone = productFromFixture('product-redone')
    const markup = buyBox(null, redone)

    expect(markup).not.toContain('radiogroup')
    expect(markup).toContain('7,90 €')
    expect(markup).toContain('-20%')
    expect(markup).toMatch(/aria-label="Количество"[^>]*max="2"/)
  })

  it('is „Изчерпан“ for a product without variants and stock 0', () => {
    const simple = productFromFixture('product-simple', { stock: 0, inStock: false })

    expect(buyBox(null, simple)).toMatch(/disabled=""[^>]*>Изчерпан<\/button>/)
  })
})

describe('PerfumePyramid', () => {
  const full = { top: 'Бергамот', heart: 'Роза', base: 'Мускус' }

  it('renders only when at least two of top, heart and base are given', () => {
    expect(html(createElement(PerfumePyramid, { perfume: null }))).toBe('')
    expect(html(createElement(PerfumePyramid, { perfume: { top: 'Бергамот' } }))).toBe('')
    expect(html(createElement(PerfumePyramid, { perfume: { aroma: 'Роза', volume: '50 мл' } }))).toBe('')
    expect(html(createElement(PerfumePyramid, { perfume: { top: 'Бергамот', base: 'Мускус' } }))).toContain('Ароматна пирамида')
  })

  it('lists the notes it has, in the order top, heart, base', () => {
    const notes = pyramidNotes(full)

    expect(notes?.map((n) => n.note.name)).toEqual(['Връхни нотки', 'Средни нотки', 'Базови нотки'])
    expect(pyramidNotes({ top: 'Бергамот', base: 'Мускус' })?.map((n) => n.text)).toEqual(['Бергамот', 'Мускус'])
  })

  it('names the aroma and the bottle when it knows them', () => {
    const markup = html(createElement(PerfumePyramid, { perfume: { ...full, aroma: 'Black Opium', volume: '100 мл' } }))

    expect(markup).toContain('Как ухае Black Opium')
    expect(markup).toContain('Флакон 100 мл')
    expect(html(createElement(PerfumePyramid, { perfume: full }))).toContain('Как ухае този аромат')
    expect(html(createElement(PerfumePyramid, { perfume: full }))).not.toContain('Флакон')
  })
})

describe('TrustBlock', () => {
  it('writes the thresholds it is given', () => {
    const markup = html(createElement(TrustBlock, { freeShippingThreshold: 39, giftThreshold: 20 }))

    expect(markup).toContain('мостри от нашите продукти')
    expect(markup).toContain('над 20 €')
    expect(markup).toContain('Безплатна доставка над 39 €')
  })

  it('follows the settings when they change, and keeps cents when there are some', () => {
    const markup = html(createElement(TrustBlock, { freeShippingThreshold: 49.9, giftThreshold: 25 }))

    expect(markup).toContain('над 25 €')
    expect(markup).toContain('над 49,90 €')
    expect(markup).not.toContain('над 39 €')
  })

  it('has the payment methods and not the word „тест“', () => {
    const markup = html(createElement(TrustBlock, { freeShippingThreshold: 39, giftThreshold: 20 }))

    expect(markup).not.toContain('aria-label="Visa"')
    expect(markup).not.toContain('aria-label="Mastercard"')
    expect(markup).toContain('НАЛОЖЕН ПЛАТЕЖ')
    expect(markup.toLowerCase()).not.toContain('тест')
  })
})

describe('ProductDetails', () => {
  it('keeps the description visible and places characteristics in accessible dropdowns', () => {
    const markup = html(createElement(ProductDetails, {
      product: yodeyma,
      description: createElement('p', null, 'Описание на продукта'),
      perfume: createElement('div', null, 'Ароматни нотки'),
      delivery: createElement('div', null, 'Доставка'),
    }))

    expect(markup).toContain('<details')
    expect(markup).toContain('<summary><span>Характеристики</span>')
    expect(markup).toContain('<summary><span>Аромат и нотки</span>')
    expect(markup).toContain('Описание на продукта')
    expect(markup).toContain('В наличност')
  })

  it('does not show empty description or perfume sections', () => {
    const markup = html(createElement(ProductDetails, {
      product: { ...yodeyma, perfume: null },
      delivery: createElement('div', null, 'Доставка'),
    }))

    expect(markup).not.toContain('<span>Описание</span>')
    expect(markup).not.toContain('Аромат и нотки')
    expect(markup).toContain('Доставка, плащане и връщане')
  })
})
