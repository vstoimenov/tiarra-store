import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { afterAll, describe, expect, it } from 'vitest'
import { IMAGE_WIDTHS, imageUrl } from '@/lib/images'
import { makeWebpVariants, uploadVariants } from '@/scripts/import/images'

const PATH = 'test/tiny'

const bucket = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false } },
).storage.from('products')

afterAll(async () => {
  await bucket.remove(IMAGE_WIDTHS.map((width) => `${PATH}-${width}.webp`))
})

describe('image storage', () => {
  it('serves uploaded variants from the public url', async () => {
    const png = await sharp({
      create: { width: 500, height: 300, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0.5 } },
    })
      .png()
      .toBuffer()

    await uploadVariants(PATH, await makeWebpVariants(png))

    // Every width is served, including the ones above the source size, so a srcset never 404s.
    for (const width of IMAGE_WIDTHS) {
      const res = await fetch(imageUrl(PATH, width))
      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toBe('image/webp')
      expect(res.headers.get('cache-control')).toContain('max-age=31536000')
    }
  })
})
