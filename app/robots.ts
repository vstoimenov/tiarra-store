import type { MetadataRoute } from 'next'
import { robotsFor } from '@/lib/seo/site'

// Static: SITE_ENV is read when the site is built, the same moment the noindex header is decided.
export default function robots(): MetadataRoute.Robots {
  return robotsFor(process.env.SITE_ENV)
}
