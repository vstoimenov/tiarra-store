import { afterEach, describe, expect, it, vi } from 'vitest'
import nextConfig from '@/next.config'
import { imageUrl } from '@/lib/images'
import { pageMetadata } from '@/lib/seo/page-metadata'
import { isProduction, robotsFor, sitemapEntries, SITE_URL } from '@/lib/seo/site'

afterEach(() => vi.unstubAllEnvs())

const BASE = 'https://shop.example'

describe('isProduction', () => {
  it('is true only for SITE_ENV=production', () => {
    vi.stubEnv('SITE_ENV', 'production')
    expect(isProduction()).toBe(true)

    for (const env of ['preview', 'development', '']) {
      vi.stubEnv('SITE_ENV', env)
      expect(isProduction()).toBe(false)
    }
  })

  it('is false when SITE_ENV is not set', () => {
    vi.stubEnv('SITE_ENV', undefined)
    expect(isProduction()).toBe(false)
  })
})

describe('SITE_URL', () => {
  it('is the absolute address without a trailing slash', () => {
    expect(SITE_URL).toMatch(/^https?:\/\/[^/]+$/)
  })
})

describe('robotsFor', () => {
  it('disallows everything outside production', () => {
    for (const env of ['preview', 'development', undefined]) {
      expect(robotsFor(env, BASE)).toEqual({ rules: { userAgent: '*', disallow: '/' } })
    }
  })

  it('allows everything in production and links the sitemap', () => {
    expect(robotsFor('production', BASE)).toEqual({
      rules: { userAgent: '*', allow: '/' },
      sitemap: `${BASE}/sitemap.xml`,
    })
  })

  it('builds the sitemap link on SITE_URL by default', () => {
    expect(robotsFor('production').sitemap).toBe(`${SITE_URL}/sitemap.xml`)
  })
})

describe('sitemapEntries', () => {
  const updated = new Date('2026-10-01T10:00:00Z')
  const fixtures = {
    categories: [{ slug: 'women' }, { slug: 'грижа-за-коса' }, { slug: 'тяло-и-аромати' }],
    products: [
      { slug: 'reuzel', updatedAt: updated },
      { slug: 'nish-lady-pearl-beach', updatedAt: new Date('2026-09-15T08:30:00Z') },
    ],
    legalSlugs: ['obshti-usloviya', 'dostavka-plashtane'],
  }
  const urls = (entries: ReturnType<typeof sitemapEntries>) => entries.map((entry) => entry.url)

  it('lists the fixed pages, every category, every product and every legal page', () => {
    expect(urls(sitemapEntries(fixtures, BASE))).toEqual([
      BASE,
      `${BASE}/store`,
      `${BASE}/promo`,
      `${BASE}/promo/za-nas`,
      `${BASE}/promo/kontakti`,
      `${BASE}/store/category/women`,
      `${BASE}/store/category/%D0%B3%D1%80%D0%B8%D0%B6%D0%B0-%D0%B7%D0%B0-%D0%BA%D0%BE%D1%81%D0%B0`,
      `${BASE}/store/category/%D1%82%D1%8F%D0%BB%D0%BE-%D0%B8-%D0%B0%D1%80%D0%BE%D0%BC%D0%B0%D1%82%D0%B8`,
      `${BASE}/store/reuzel`,
      `${BASE}/store/nish-lady-pearl-beach`,
      `${BASE}/obshti-usloviya`,
      `${BASE}/dostavka-plashtane`,
    ])
  })

  it('percent-encodes the Cyrillic category slug', () => {
    const entries = sitemapEntries(fixtures, BASE)

    expect(urls(entries)).toContain(`${BASE}/store/category/${encodeURIComponent('грижа-за-коса')}`)
    // No raw non-ASCII character may reach a <loc>.
    expect(urls(entries).filter((url) => /[^\x20-\x7e]/.test(url))).toEqual([])
  })

  it('takes a product lastModified from its updated_at, and leaves other pages without one', () => {
    const entries = sitemapEntries(fixtures, BASE)
    const byUrl = new Map(entries.map((entry) => [entry.url, entry]))

    expect(byUrl.get(`${BASE}/store/reuzel`)?.lastModified).toEqual(updated)
    expect(byUrl.get(`${BASE}/store`)?.lastModified).toBeUndefined()
    expect(byUrl.get(`${BASE}/store/category/women`)?.lastModified).toBeUndefined()
  })

  it('lists no address twice', () => {
    const all = urls(sitemapEntries(fixtures, BASE))
    expect(new Set(all).size).toBe(all.length)
  })

  it('builds on SITE_URL by default', () => {
    expect(urls(sitemapEntries({ categories: [], products: [], legalSlugs: [] }))[0]).toBe(SITE_URL)
  })
})

describe('redirects of the old shop', () => {
  it('are exactly the agreed list, all 301', async () => {
    expect(await nextConfig.redirects?.()).toEqual([
      { source: '/blog', destination: '/', statusCode: 301 },
      { source: '/blog/:slug*', destination: '/', statusCode: 301 },
      { source: '/about-us', destination: '/promo/za-nas', statusCode: 301 },
      { source: '/contact-us', destination: '/promo/kontakti', statusCode: 301 },
      { source: '/special-deals', destination: '/promo', statusCode: 301 },
      { source: '/dsa', destination: '/', statusCode: 301 },
      { source: '/shipping-terms', destination: '/dostavka-plashtane', statusCode: 301 },
      { source: '/signin', destination: '/', statusCode: 301 },
    ])
  })
})

describe('X-Robots-Tag header', () => {
  const noindex = [{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }]

  it('is sent on every path outside production', async () => {
    for (const env of ['preview', 'development']) {
      vi.stubEnv('SITE_ENV', env)
      expect(await nextConfig.headers?.()).toEqual(noindex)
    }
    vi.stubEnv('SITE_ENV', undefined)
    expect(await nextConfig.headers?.()).toEqual(noindex)
  })

  it('is not sent in production', async () => {
    vi.stubEnv('SITE_ENV', 'production')
    expect(await nextConfig.headers?.()).toEqual([])
  })
})

describe('pageMetadata', () => {
  const meta = pageMetadata({
    title: 'Доставка и плащане | Tiarra Cosmetics',
    description: 'Как доставяме с Еконт и Спиди.',
    path: '/dostavka-plashtane',
  })

  it('sets the title, the description and an absolute canonical address', () => {
    expect(meta.title).toBe('Доставка и плащане | Tiarra Cosmetics')
    expect(meta.description).toBe('Как доставяме с Еконт и Спиди.')
    expect(meta.alternates?.canonical).toBe(`${SITE_URL}/dostavka-plashtane`)
  })

  it('repeats them for Open Graph, with the hero image unless another one is given', () => {
    expect(meta.openGraph).toMatchObject({
      title: 'Доставка и плащане | Tiarra Cosmetics',
      description: 'Как доставяме с Еконт и Спиди.',
      url: `${SITE_URL}/dostavka-plashtane`,
      siteName: 'Tiarra Cosmetics',
      locale: 'bg_BG',
      type: 'website',
      images: [{ url: imageUrl('site/hero', 1200), alt: 'Tiarra Cosmetics' }],
    })
  })

  // Next writes the home page's canonical without the slash, so the sitemap does the same: one spelling everywhere.
  it('keeps an already encoded path as it is, and the home page at the bare address', () => {
    const category = pageMetadata({ title: 'T', description: 'D', path: '/store/category/%D0%B3' })
    expect(category.alternates?.canonical).toBe(`${SITE_URL}/store/category/%D0%B3`)
    expect(pageMetadata({ title: 'T', description: 'D', path: '/' }).alternates?.canonical).toBe(SITE_URL)
  })
})
