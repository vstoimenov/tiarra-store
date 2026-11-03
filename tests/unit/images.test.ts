import sharp from 'sharp'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { imageOrigin, imageSrcSet, imageUrl } from '@/lib/images'
import { makeWebpVariants } from '@/scripts/import/images'

async function png(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 4, background: { r: 229, g: 167, b: 46, alpha: 1 } },
  })
    .png()
    .toBuffer()
}

describe('makeWebpVariants', () => {
  it('returns three webp files', async () => {
    const variants = await makeWebpVariants(await png(1600, 1000))

    expect(variants.map((v) => v.width)).toEqual([400, 800, 1200])
    for (const variant of variants) {
      expect((await sharp(variant.data).metadata()).format).toBe('webp')
    }
  })

  it('never enlarges', async () => {
    const variants = await makeWebpVariants(await png(600, 400))

    expect(variants).toHaveLength(3)
    for (const variant of variants) {
      expect((await sharp(variant.data).metadata()).width).toBeLessThanOrEqual(600)
    }
  })
})

describe('image urls', () => {
  const original = process.env.NEXT_PUBLIC_SUPABASE_URL

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'
  })

  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
    else process.env.NEXT_PUBLIC_SUPABASE_URL = original
  })

  it('imageUrl builds the public storage url for one width', () => {
    expect(imageUrl('abc', 800)).toBe(
      'http://127.0.0.1:54321/storage/v1/object/public/products/abc-800.webp',
    )
  })

  it('imageSrcSet lists every width', () => {
    const srcSet = imageSrcSet('abc')

    expect(srcSet).toContain('abc-400.webp 400w')
    expect(srcSet).toContain('abc-1200.webp 1200w')
  })

  it('keeps a public bootstrap image URL unchanged', () => {
    const url = 'https://cdn.example/products/item.png'
    expect(imageUrl(url, 800)).toBe(url)
    expect(imageSrcSet(url)).toBe(url)
  })

  it('imageOrigin is the scheme, host and port the pictures come from, without a path or a slash', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abc.supabase.co/'
    expect(imageOrigin()).toBe('https://abc.supabase.co')

    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'
    expect(imageOrigin()).toBe('http://127.0.0.1:54321')
  })

  it('imageOrigin is null when the address is not set or not an address', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    expect(imageOrigin()).toBeNull()

    process.env.NEXT_PUBLIC_SUPABASE_URL = 'not a url'
    expect(imageOrigin()).toBeNull()
  })
})
