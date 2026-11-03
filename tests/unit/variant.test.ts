import { describe, expect, it } from 'vitest'
import { initialVariantId, resolveVariantState } from '@/lib/catalog/variant'
import { productFromFixture } from './helpers/product-fixture'

const yodeyma = productFromFixture('product-yodeyma')
const idOf = (name: string) => yodeyma.variants.find((v) => v.name === name)!.id

describe('initialVariantId', () => {
  it('is the first variant when it is in stock', () => {
    expect(initialVariantId(yodeyma)).toBe(idOf('BLACK ELIXIR'))
  })

  it('skips a first variant that is out of stock', () => {
    const first = { ...yodeyma.variants[0], stock: 0 }
    const product = { ...yodeyma, variants: [first, ...yodeyma.variants.slice(1)] }

    expect(initialVariantId(product)).toBe(idOf('BOREAL'))
  })

  it('counts a variant whose stock is not tracked as available', () => {
    const untracked = yodeyma.variants.map((v, i) => ({ ...v, stock: i === 0 ? 0 : null }))

    expect(initialVariantId({ ...yodeyma, variants: untracked })).toBe(untracked[1].id)
  })

  it('goes by position, not by the order of the array', () => {
    const reversed = [...yodeyma.variants].reverse()

    expect(initialVariantId({ ...yodeyma, variants: reversed })).toBe(idOf('BLACK ELIXIR'))
  })

  it('falls back to the first variant when every one is out of stock, so something is selected', () => {
    const none = yodeyma.variants.map((v) => ({ ...v, stock: 0 }))

    expect(initialVariantId({ ...yodeyma, variants: none })).toBe(none[0].id)
  })

  it('is null for a product without variants', () => {
    expect(initialVariantId(productFromFixture('product-simple'))).toBeNull()
  })
})

describe('resolveVariantState', () => {
  it('gives the price, old price and percent of a discounted variant', () => {
    expect(resolveVariantState(yodeyma, idOf('BLACK ELIXIR'))).toMatchObject({
      price: 29.9,
      compareAtPrice: 34.9,
      discountPercent: 14,
      inStock: true,
    })
  })

  it('has no old price or percent for a variant that is not on sale', () => {
    expect(resolveVariantState(yodeyma, idOf('BOREAL'))).toMatchObject({
      price: 34.9,
      compareAtPrice: null,
      discountPercent: null,
      inStock: true,
    })
  })

  it('treats an old price that is not above the price as no old price (ruling R7)', () => {
    const variants = yodeyma.variants.map((v) => ({ ...v, compareAtPrice: v.price }))

    expect(resolveVariantState({ ...yodeyma, variants }, variants[0].id)).toMatchObject({
      compareAtPrice: null,
      discountPercent: null,
    })
  })

  it('marks only the variant with stock 0 as out of stock; the product stays in stock', () => {
    expect(resolveVariantState(yodeyma, idOf('LINET')).inStock).toBe(false)
    expect(resolveVariantState(yodeyma, idOf('BOREAL')).inStock).toBe(true)
    expect(yodeyma.inStock).toBe(true)
  })

  it('reports the stock of the variant, null when it is not tracked', () => {
    expect(resolveVariantState(yodeyma, idOf('BLACK ELIXIR')).stock).toBe(2)
    const untracked = yodeyma.variants.map((v) => ({ ...v, stock: null }))
    expect(resolveVariantState({ ...yodeyma, variants: untracked }, untracked[0].id)).toMatchObject({
      stock: null,
      inStock: true,
    })
  })

  it('gives the image of the variant, and null when it has none', () => {
    expect(resolveVariantState(yodeyma, idOf('NYA')).imagePath).toBe(yodeyma.variants.find((v) => v.name === 'NYA')!.imagePath)
    const bare = yodeyma.variants.map((v) => ({ ...v, imagePath: null }))
    expect(resolveVariantState({ ...yodeyma, variants: bare }, bare[0].id).imagePath).toBeNull()
  })

  it('uses the fields of the product itself when it has no variants', () => {
    const redone = productFromFixture('product-redone')

    expect(resolveVariantState(redone, null)).toEqual({
      price: 7.9,
      compareAtPrice: 9.9,
      discountPercent: 20,
      inStock: true,
      stock: 2,
      imagePath: redone.imagePath,
    })
  })

  it('uses the product itself when the variant id is unknown', () => {
    const redone = productFromFixture('product-redone')

    expect(resolveVariantState(redone, 'nope')).toMatchObject({ price: 7.9, compareAtPrice: 9.9 })
  })

  it('is out of stock for a product without variants and stock 0', () => {
    const simple = productFromFixture('product-simple', { stock: 0, inStock: false })

    expect(resolveVariantState(simple, null)).toMatchObject({ price: 10.5, inStock: false, stock: 0 })
  })
})
