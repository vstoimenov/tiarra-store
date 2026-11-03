import type { NextConfig } from 'next'
// First, on purpose: a preview or production build without its addresses would ship broken
// picture and canonical links, so it fails when the config loads. Imports run in order, and the
// next one already needs SITE_URL.
import './lib/site/check-env'
import { isProduction } from './lib/seo/site'

// The old ConvertBuilder shop's addresses that are not pages of this one. 301 and not `permanent`
// (which is a 308): search engines and the live sitemap check expect a plain 301.
// `/blog` is listed on its own although `/blog/:slug*` also matches it, so the list reads like the brief.
const OLD_SHOP_REDIRECTS = [
  ['/blog', '/'],
  ['/blog/:slug*', '/'],
  ['/about-us', '/promo/za-nas'],
  ['/contact-us', '/promo/kontakti'],
  ['/special-deals', '/promo'],
  ['/dsa', '/'],
  ['/shipping-terms', '/dostavka-plashtane'],
  ['/signin', '/'],
] as const

const nextConfig: NextConfig = {
  poweredByHeader: false,

  async redirects() {
    return OLD_SHOP_REDIRECTS.map(([source, destination]) => ({ source, destination, statusCode: 301 }))
  },

  // Everything but production tells crawlers to stay away (read when the config loads, so a
  // build or server started with SITE_ENV=production sends nothing).
  async headers() {
    if (isProduction()) return []
    return [{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }]
  },
}

export default nextConfig
