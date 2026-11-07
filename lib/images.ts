// Image URL helpers shared by server and client components: no sharp, no supabase-js in here.
// The import script (scripts/import/images.ts) writes `${path}-${width}.webp` objects to the
// public `products` bucket; these helpers build the URLs for exactly those objects.

export const IMAGE_WIDTHS = [400, 800, 1200] as const

export type ImageWidth = (typeof IMAGE_WIDTHS)[number]

// Critical editorial images live with the app so the hero and logo do not wait for third-party
// origins. The remaining bootstrap images keep their original public addresses for now.
const LOCAL_SITE_IMAGE_PREFIXES: Record<string, string> = {
  'site/hero': '/site/hero',
  'site/logo': '/site/logo',
  'site/offer': '/site/offer',
  'site/about': '/site/founder-2026',
}

const SITE_IMAGE_URLS: Record<string, string> = {
  'site/avatar-1': 'https://content.app-sources.com/s/908012564280219571/uploads/%D0%98%D0%B7%D0%BE%D0%B1%D1%80%D0%B0%D0%B6%D0%B5%D0%BD%D0%B8%D1%8F/98cc76fe-a7b1-4136-bd4c-48458e798383-0699065.png',
  'site/avatar-2': 'https://content.app-sources.com/s/908012564280219571/uploads/%D0%98%D0%B7%D0%BE%D0%B1%D1%80%D0%B0%D0%B6%D0%B5%D0%BD%D0%B8%D1%8F/unnamed-0699109.png',
  'site/avatar-3': 'https://content.app-sources.com/s/908012564280219571/uploads/%D0%98%D0%B7%D0%BE%D0%B1%D1%80%D0%B0%D0%B6%D0%B5%D0%BD%D0%B8%D1%8F/adcded21-09bf-486f-935e-f693ea34a326-0699148.png',
  'site/avatar-4': 'https://content.app-sources.com/s/908012564280219571/uploads/%D0%98%D0%B7%D0%BE%D0%B1%D1%80%D0%B0%D0%B6%D0%B5%D0%BD%D0%B8%D1%8F/unnamed-0699291.png',
  'site/avatar-5': 'https://content.app-sources.com/s/908012564280219571/uploads/%D0%98%D0%B7%D0%BE%D0%B1%D1%80%D0%B0%D0%B6%D0%B5%D0%BD%D0%B8%D1%8F/unnamed_2-0699501.png',
}

/** Public URL of one resized copy. `path` is the storage key without width or extension. */
export function imageUrl(path: string, width: ImageWidth): string {
  if (/^\/catalog\/chogan\/\d{3}$/.test(path)) return `${path}.webp?v=2`
  // The first catalog bootstrap may retain the original public CDN URL. This keeps the
  // storefront usable before the background Storage copy has completed.
  if (/^https?:\/\//.test(path)) return path
  if (LOCAL_SITE_IMAGE_PREFIXES[path]) return `${LOCAL_SITE_IMAGE_PREFIXES[path]}-${width}.webp`
  if (SITE_IMAGE_URLS[path]) return SITE_IMAGE_URLS[path]
  // Read at call time (not module load) so tests can set it, and so Next can inline it in the browser bundle.
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '')
  return `${base}/storage/v1/object/public/products/${path}-${width}.webp`
}

/** `srcset` value listing every width of one image. */
export function imageSrcSet(path: string): string {
  if (/^\/catalog\/chogan\/\d{3}$/.test(path)) return `${path}.webp?v=2`
  if (/^https?:\/\//.test(path)) return path
  if (LOCAL_SITE_IMAGE_PREFIXES[path]) {
    return IMAGE_WIDTHS.map((width) => `${imageUrl(path, width)} ${width}w`).join(', ')
  }
  if (SITE_IMAGE_URLS[path]) return SITE_IMAGE_URLS[path]
  return IMAGE_WIDTHS.map((width) => `${imageUrl(path, width)} ${width}w`).join(', ')
}

/**
 * The origin the pictures are served from, for a `preconnect` hint; `null` when the address is not set.
 * (Same variable as imageUrl, read at call time.)
 */
export function imageOrigin(): string | null {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').origin
  } catch {
    return null
  }
}
