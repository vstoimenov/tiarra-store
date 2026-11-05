import { productCrumbs } from '@/lib/catalog/crumbs'
import { isAvailable } from '@/lib/catalog/stock'
import type { Product } from '@/lib/catalog/types'
import { imageUrl } from '@/lib/images'
import { htmlToText } from '@/lib/sections/faq-jsonld'

const IN_STOCK = 'https://schema.org/InStock'
const OUT_OF_STOCK = 'https://schema.org/OutOfStock'

type JsonLd = Record<string, unknown>

/** 29.9 stays 29.9 and 29.900000000000002 becomes 29.9: prices are cents. */
const cents = (n: number) => Math.round(n * 100) / 100

function offersOf(p: Product, url: string): JsonLd {
  if (p.variants.length === 0) {
    return {
      '@type': 'Offer',
      price: cents(p.price),
      priceCurrency: 'EUR',
      availability: p.inStock ? IN_STOCK : OUT_OF_STOCK,
      url,
    }
  }

  const prices = p.variants.map((v) => v.price)
  return {
    '@type': 'AggregateOffer',
    lowPrice: cents(Math.min(...prices)),
    highPrice: cents(Math.max(...prices)),
    priceCurrency: 'EUR',
    offerCount: p.variants.length,
    // The product is in stock as long as one variant is, whatever the others are.
    availability: p.variants.some((v) => isAvailable(v.stock)) ? IN_STOCK : OUT_OF_STOCK,
    url,
  }
}

/**
 * schema.org for a product page: the Product (one Offer, or an AggregateOffer over its variants)
 * and the BreadcrumbList the page shows. `url` is the absolute address of the page.
 */
export function productJsonLd(p: Product, url: string): JsonLd[] {
  const origin = new URL(url).origin
  const description = htmlToText(p.descriptionHtml)

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.title,
      ...(description && { description }),
      ...(p.images.length > 0 && { image: p.images.map((i) => new URL(imageUrl(i.path, 1200), origin).toString()) }),
      ...(p.brand && { brand: { '@type': 'Brand', name: p.brand } }),
      url,
      offers: offersOf(p, url),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: productCrumbs(p).map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.label,
        item: `${origin}${crumb.href}`,
      })),
    },
  ]
}

/** JSON for a `<script type="application/ld+json">`: compact, and with `<` escaped so text can never close the tag. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
