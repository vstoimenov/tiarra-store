import type { MetadataRoute } from 'next'
// Relative, not `@/…`: next.config.ts imports this file, and the config is loaded before Next
// knows the tsconfig paths.
import { siteUrl } from '../site/url'

/** The public address, without a trailing slash. Production without `SITE_URL` fails here. */
export const SITE_URL = siteUrl()

/** Only `SITE_ENV=production` is indexed; preview, development and an unset variable are not. */
export function isProduction(): boolean {
  return process.env.SITE_ENV === 'production'
}

/**
 * A path as an absolute address. The home page is the bare address, with no slash: that is how
 * Next writes its canonical and how the live sitemap listed it, so every place spells it alike.
 */
export function absoluteUrl(path: string, base: string = SITE_URL): string {
  return path === '/' ? base : `${base}${path}`
}

/** The robots.txt: open and pointing at the sitemap in production, closed everywhere else. */
export function robotsFor(env: string | undefined, base: string = SITE_URL): MetadataRoute.Robots {
  if (env === 'production') return { rules: { userAgent: '*', allow: '/' }, sitemap: `${base}/sitemap.xml` }
  return { rules: { userAgent: '*', disallow: '/' } }
}

export interface SitemapInput {
  categories: { slug: string }[]
  products: { slug: string; updatedAt: Date }[]
  /** The slugs of the legal pages that live at the top level (`/obshti-usloviya`). */
  legalSlugs: string[]
}

/**
 * Every page of the site as an absolute address. Slugs are percent-encoded: the Cyrillic
 * category slugs must not reach a `<loc>` raw. Only products carry a `lastModified`, because
 * they are the only pages whose last change is recorded.
 */
export function sitemapEntries(input: SitemapInput, base: string = SITE_URL): MetadataRoute.Sitemap {
  const at = (path: string) => absoluteUrl(path, base)
  return [
    ...['/', '/store', '/promo', '/promo/za-nas', '/promo/kontakti'].map((path) => ({ url: at(path) })),
    ...input.categories.map(({ slug }) => ({ url: at(`/store/category/${encodeURIComponent(slug)}`) })),
    ...input.products.map(({ slug, updatedAt }) => ({
      url: at(`/store/${encodeURIComponent(slug)}`),
      lastModified: updatedAt,
    })),
    ...input.legalSlugs.map((slug) => ({ url: at(`/${encodeURIComponent(slug)}`) })),
  ]
}
