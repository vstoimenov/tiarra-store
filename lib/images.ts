// Image URL helpers shared by server and client components: no sharp, no supabase-js in here.
// The import script (scripts/import/images.ts) writes `${path}-${width}.webp` objects to the
// public `products` bucket; these helpers build the URLs for exactly those objects.

export const IMAGE_WIDTHS = [400, 800, 1200] as const

export type ImageWidth = (typeof IMAGE_WIDTHS)[number]

/** Public URL of one resized copy. `path` is the storage key without width or extension. */
export function imageUrl(path: string, width: ImageWidth): string {
  // Read at call time (not module load) so tests can set it, and so Next can inline it in the browser bundle.
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '')
  return `${base}/storage/v1/object/public/products/${path}-${width}.webp`
}

/** `srcset` value listing every width of one image. */
export function imageSrcSet(path: string): string {
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
