import { describe, expect, it } from 'vitest'
import { productCrumbs } from '@/lib/catalog/crumbs'
import { imageUrl } from '@/lib/images'
import { metaDescription } from '@/lib/seo/meta-description'
import { productJsonLd, serializeJsonLd } from '@/lib/seo/product-jsonld'
import { productFromFixture } from './helpers/product-fixture'

const ORIGIN = 'https://shop.example'
const yodeyma = productFromFixture('product-yodeyma')
const urlOf = (slug: string) => `${ORIGIN}/store/${slug}`

type Json = Record<string, unknown>

function build(product = yodeyma): { product: Json; breadcrumbs: Json } {
  const [first, second] = productJsonLd(product, urlOf(product.slug)) as Json[]
  return { product: first, breadcrumbs: second }
}

describe('productJsonLd', () => {
  it('returns a Product and a BreadcrumbList', () => {
    const list = productJsonLd(yodeyma, urlOf(yodeyma.slug)) as Json[]

    expect(list).toHaveLength(2)
    expect(list[0]).toMatchObject({ '@context': 'https://schema.org', '@type': 'Product', name: yodeyma.title })
    expect(list[1]).toMatchObject({ '@context': 'https://schema.org', '@type': 'BreadcrumbList' })
  })

  it('describes variants as an AggregateOffer with the lowest and highest price', () => {
    expect(build().product.offers).toMatchObject({
      '@type': 'AggregateOffer',
      lowPrice: 29.9,
      highPrice: 34.9,
      priceCurrency: 'EUR',
      offerCount: 10,
    })
  })

  it('says a product with variants is in stock while one variant is available', () => {
    const offers = build().product.offers as Json

    expect(offers.availability).toBe('https://schema.org/InStock')
  })

  it('says a product with every variant out of stock is out of stock', () => {
    const variants = yodeyma.variants.map((v) => ({ ...v, stock: 0 }))
    const offers = build({ ...yodeyma, variants, inStock: false }).product.offers as Json

    expect(offers.availability).toBe('https://schema.org/OutOfStock')
  })

  it('describes a simple product as one Offer with its price and availability', () => {
    const redone = productFromFixture('product-redone')
    const { product } = build(redone)

    expect(product.offers).toMatchObject({
      '@type': 'Offer',
      price: 7.9,
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
      url: urlOf(redone.slug),
    })
  })

  it('marks a simple product with stock 0 as out of stock', () => {
    const simple = productFromFixture('product-simple', { stock: 0, inStock: false })
    const { product } = build(simple)

    expect(product.offers).toMatchObject({ '@type': 'Offer', availability: 'https://schema.org/OutOfStock' })
  })

  it('uses the page url and absolute image urls at 1200 px', () => {
    const { product } = build()

    expect(product.url).toBe(urlOf(yodeyma.slug))
    expect(product.image).toEqual(yodeyma.images.map((i) => new URL(imageUrl(i.path, 1200), new URL(urlOf(yodeyma.slug)).origin).toString()))
    expect((product.image as string[]).every((u) => u.startsWith('http'))).toBe(true)
  })

  it('leaves the image out when the product has none', () => {
    const { product } = build({ ...yodeyma, images: [], imagePath: null })

    expect(product).not.toHaveProperty('image')
  })

  it('names the brand when there is one', () => {
    expect(build({ ...yodeyma, brand: 'YODEYMA' }).product.brand).toEqual({ '@type': 'Brand', name: 'YODEYMA' })
    expect(build().product).not.toHaveProperty('brand')
  })

  it('takes the description from the text of the description html', () => {
    const { product } = build({ ...yodeyma, descriptionHtml: '<p>Първо.</p><p>Второ &amp; трето.</p>' })

    expect(product.description).toBe('Първо. Второ & трето.')
  })
})

describe('breadcrumbs', () => {
  it('mirror the crumbs the page shows: home, the first category, the product', () => {
    const crumbs = productCrumbs(yodeyma)

    expect(crumbs.map((c) => c.label)).toEqual(['Начало', yodeyma.categories[0].name, yodeyma.title])
    expect(crumbs.map((c) => c.href)).toEqual([
      '/',
      `/store/category/${encodeURIComponent(yodeyma.categories[0].slug)}`,
      `/store/${yodeyma.slug}`,
    ])
  })

  it('takes the first category by position, not by the order of the array', () => {
    const categories = [
      { id: 'a', slug: 'b-second', name: 'Втора', position: 2 },
      { id: 'b', slug: 'a-first', name: 'Първа', position: 1 },
    ]

    expect(productCrumbs({ ...yodeyma, categories })[1]).toEqual({ label: 'Първа', href: '/store/category/a-first' })
  })

  it('encodes a cyrillic category slug in the link', () => {
    const categories = [{ id: 'a', slug: 'грижа-за-коса', name: 'ГРИЖА ЗА КОСА', position: 0 }]

    expect(productCrumbs({ ...yodeyma, categories })[1].href).toBe(
      '/store/category/%D0%B3%D1%80%D0%B8%D0%B6%D0%B0-%D0%B7%D0%B0-%D0%BA%D0%BE%D1%81%D0%B0',
    )
  })

  it('skip the category when the product has none', () => {
    expect(productCrumbs({ ...yodeyma, categories: [] }).map((c) => c.label)).toEqual(['Начало', yodeyma.title])
  })

  it('are the same list in the BreadcrumbList, with absolute urls', () => {
    const { breadcrumbs } = build()
    const items = breadcrumbs.itemListElement as Json[]
    const crumbs = productCrumbs(yodeyma)

    expect(items.map((i) => i.position)).toEqual([1, 2, 3])
    expect(items.map((i) => i.name)).toEqual(crumbs.map((c) => c.label))
    expect(items.map((i) => i.item)).toEqual(crumbs.map((c) => `${ORIGIN}${c.href}`))
    expect(items.every((i) => i['@type'] === 'ListItem')).toBe(true)
  })
})

describe('serializeJsonLd', () => {
  it('escapes < so a title cannot close the script tag', () => {
    const text = serializeJsonLd(productJsonLd({ ...yodeyma, title: '</script><b>x' }, urlOf(yodeyma.slug)))

    expect(text).not.toContain('<')
    expect(JSON.parse(text)[0].name).toBe('</script><b>x')
  })

  it('writes compact json, so "@type":"Product" can be found as is', () => {
    expect(serializeJsonLd(productJsonLd(yodeyma, urlOf(yodeyma.slug)))).toContain('"@type":"Product"')
  })
})

describe('metaDescription', () => {
  it('is the text of the html, tags stripped', () => {
    expect(metaDescription('<p>Парфюм <b>с характер</b>.</p>')).toBe('Парфюм с характер.')
  })

  it('cuts a long text at a word before 155 characters and ends with an ellipsis', () => {
    const text = metaDescription(`<p>${'дума '.repeat(60)}</p>`)

    expect(text.length).toBeLessThanOrEqual(155)
    expect(text.endsWith('…')).toBe(true)
    expect(text).not.toMatch(/\s…$/)
  })

  it('keeps a text that fits as it is', () => {
    expect(metaDescription('<p>Кратко описание.</p>')).toBe('Кратко описание.')
  })

  it('is empty for an empty description', () => {
    expect(metaDescription('')).toBe('')
  })
})
