import type { MetadataRoute } from 'next'
import { getCategories, getProductSitemapEntries } from '@/lib/catalog/queries'
import { sitemapEntries } from '@/lib/seo/site'
import { LEGAL_PAGE_SLUGS } from '@/lib/site/pages'

// Static, built with the catalog: a product that is added or hidden shows up after the next build.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products] = await Promise.all([getCategories(), getProductSitemapEntries()])

  return sitemapEntries({ categories, products, legalSlugs: [...LEGAL_PAGE_SLUGS] })
}
