import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { IMAGE_WIDTHS } from '../../lib/images'

const BUCKET = 'products'
const WEBP_QUALITY = 78
const DOWNLOAD_TIMEOUT_MS = 30_000

// Same browser UA as the page fetches; the image CDN and i.ibb.co answer 200 with it.
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'

export interface WebpVariant {
  width: number
  data: Buffer
}

/** Stable storage key for a source URL: the same URL always lands on the same object. */
export function sourceKey(sourceUrl: string): string {
  return createHash('sha1').update(sourceUrl).digest('hex').slice(0, 16)
}

/**
 * One WebP per width in IMAGE_WIDTHS, alpha kept. A source narrower than a target width is not
 * enlarged, so those files simply hold the smaller image; every width is still produced so a
 * `srcset` built from IMAGE_WIDTHS never points at a missing object.
 */
export async function makeWebpVariants(input: Buffer): Promise<WebpVariant[]> {
  return Promise.all(
    IMAGE_WIDTHS.map(async (width) => ({
      width,
      data: await sharp(input)
        .rotate() // apply EXIF orientation before the metadata is dropped
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer(),
    })),
  )
}

export async function downloadImage(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'image/*' },
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
  })
  if (res.status !== 200) throw new Error(`Image download failed (${res.status}): ${url}`)
  return Buffer.from(await res.arrayBuffer())
}

function storage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set')
  return createClient(url, key, { auth: { persistSession: false } }).storage.from(BUCKET)
}

/** Writes `${path}-${width}.webp` for every variant, replacing earlier copies. */
export async function uploadVariants(path: string, variants: WebpVariant[]): Promise<void> {
  const bucket = storage()
  await Promise.all(
    variants.map(async ({ width, data }) => {
      const objectName = `${path}-${width}.webp`
      const { error } = await bucket.upload(objectName, data, {
        upsert: true,
        cacheControl: '31536000',
        contentType: 'image/webp',
      })
      if (error) throw new Error(`Upload of ${objectName} failed: ${error.message}`)
    }),
  )
}

/** download → resize → upload. Returns the size of the largest variant. */
export async function importImage(
  url: string,
  path: string,
): Promise<{ width: number; height: number }> {
  const variants = await makeWebpVariants(await downloadImage(url))
  await uploadVariants(path, variants)

  const largest = variants[variants.length - 1]
  const { width, height } = await sharp(largest.data).metadata()
  if (!width || !height) throw new Error(`Could not read the size of ${url}`)
  return { width, height }
}
