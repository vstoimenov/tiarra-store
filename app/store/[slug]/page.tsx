import { splitProductDescription } from '@/lib/catalog/split-description'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { Breadcrumbs } from '@/components/product/Breadcrumbs'
import { Description } from '@/components/product/Description'
import { PerfumePyramid, pyramidNotes } from '@/components/product/PerfumePyramid'
import { ProductDetails } from '@/components/product/ProductDetails'
import { ProductView } from '@/components/product/ProductView'
import { RelatedProducts } from '@/components/product/RelatedProducts'
import { ShareButtons } from '@/components/product/ShareButtons'
import { TrustBlock } from '@/components/product/TrustBlock'
import { productCrumbs } from '@/lib/catalog/crumbs'
import { getProductBump } from '@/lib/catalog/bumps'
import { getAllProductSlugs, getProductBySlug, getRelatedProducts } from '@/lib/catalog/queries'
import { imageUrl } from '@/lib/images'
import { metaDescription } from '@/lib/seo/meta-description'
import { productJsonLd, serializeJsonLd } from '@/lib/seo/product-jsonld'
import { getSiteDocument } from '@/lib/site/documents'
import { getCommerceSettings } from '@/lib/commerce-settings'
import { siteUrl } from '@/lib/site/url'
import styles from './page.module.css'

// Build visible products ahead of time; allow an admin to reactivate a hidden product without a deployment.
// The old shop's addresses (`/store/reuzel`) are product slugs too, so they keep working.
export const dynamicParams = true

export async function generateStaticParams() {
  return (await getAllProductSlugs()).map((slug) => ({ slug }))
}

// Metadata and page both need the product; `cache` makes that one query per request.
const getProduct = cache(getProductBySlug)

type Params = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const product = await getProduct((await params).slug)
  if (!product) return {}

  const url = `${siteUrl()}/store/${encodeURIComponent(product.slug)}`
  // The old shop left every SEO description empty, so the text of the description stands in.
  const description = product.seoDescription?.trim() || metaDescription(product.descriptionHtml)
  const title = `${product.title} | Tiarra Cosmetics`
  const cover = product.images[0]
  // The 1200 px copy is never larger than the source, and keeps its proportions.
  const coverWidth = cover ? Math.min(cover.width, 1200) : 0
  const coverHeight = cover && cover.width > 0 ? Math.round((cover.height * coverWidth) / cover.width) : 0

  return {
    title,
    ...(description && { description }),
    alternates: { canonical: url },
    openGraph: {
      title,
      ...(description && { description }),
      url,
      type: 'website',
      siteName: 'Tiarra Cosmetics',
      locale: 'bg_BG',
      ...(cover && {
        images: [{ url: imageUrl(cover.path, 1200), width: coverWidth, height: coverHeight, alt: cover.alt || product.title }],
      }),
    },
  }
}

export default async function ProductPage({ params }: Params) {
  const product = await getProduct((await params).slug)
  if (!product) notFound()

  const [related, settings, bump,commerce] = await Promise.all([
    getRelatedProducts(product, 8),
    getSiteDocument('settings'),
    getProductBump(product),
    getCommerceSettings(),
  ])
  const url = `${siteUrl()}/store/${encodeURIComponent(product.slug)}`

  return (
    <>
      <ProductView
        product={product}
        bump={bump}
        breadcrumbs={<Breadcrumbs crumbs={productCrumbs(product)} />}
      />
      <div className={styles.details}>
        <ProductDetails
          product={product}
          description={product.descriptionHtml.trim() ? <Description html={splitProductDescription(product.descriptionHtml, product.title)} /> : undefined}
          perfume={pyramidNotes(product.perfume) ? <PerfumePyramid perfume={product.perfume} /> : undefined}
          delivery={<TrustBlock
            freeShippingThreshold={commerce.freeShippingThreshold}
            giftThreshold={settings.giftThreshold}
            deliveryEstimate={commerce.deliveryEstimate}
            dispatchHours={commerce.dispatchHours}
            couriersLabel={[commerce.econtEnabled&&'Еконт',commerce.speedyEnabled&&'Спиди'].filter(Boolean).join(' или ')}
          />}
        />
        <ShareButtons />
      </div>
      <RelatedProducts cards={related} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(productJsonLd(product, url)) }} />
    </>
  )
}
