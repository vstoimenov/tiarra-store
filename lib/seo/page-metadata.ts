import type { Metadata } from 'next'
import { imageUrl } from '@/lib/images'
import { absoluteUrl } from './site'

interface PageMeta {
  /** The whole title, suffix included. */
  title: string
  description: string
  /** The page's path, already percent-encoded: `/store/category/%D0%B3…`. */
  path: string
  /** Defaults to the hero image, which stands in for every page that has no picture of its own. */
  image?: { url: string; alt: string }
}

/**
 * The metadata every page sets: title, description, an absolute canonical address and an Open
 * Graph card. A page's `openGraph` replaces the layout's whole, so each page has to carry
 * all of it, which is what this is for.
 */
export function pageMetadata({ title, description, path, image }: PageMeta): Metadata {
  const url = absoluteUrl(path)
  const picture = image ?? { url: imageUrl('site/hero', 1200), alt: 'Tiarra Cosmetics' }

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      siteName: 'Tiarra Cosmetics',
      locale: 'bg_BG',
      images: [picture],
    },
  }
}
