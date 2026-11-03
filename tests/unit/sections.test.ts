import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { HomeDocSchema, SectionSchema, type Section } from '@/lib/sections/schema'
import { visibleSections } from '@/lib/sections/visible'
import { NavigationSchema, SettingsSchema } from '@/lib/site/schema'

function seed(name: string): unknown {
  return JSON.parse(readFileSync(new URL(`../../seed/${name}.json`, import.meta.url), 'utf8'))
}

const NOW = new Date('2026-10-30T12:00:00.000Z')
const minutes = (n: number) => new Date(NOW.getTime() + n * 60_000).toISOString()

/** The smallest valid section; the window cases only vary its visibility fields. */
function ratingSection(extra: Partial<Pick<Section, 'enabled' | 'showFrom' | 'showUntil'>> = {}): Section {
  return {
    id: 'rating',
    type: 'rating',
    enabled: true,
    data: { stars: 5, score: '5.0', text: 'С доверието на 290+ доволни клиенти' },
    ...extra,
  }
}

describe('seed documents', () => {
  it('seed home is valid', () => {
    const raw = seed('home')
    const doc = HomeDocSchema.parse(raw)

    expect(doc.sections).toHaveLength(10)
    expect(doc.sections.map((s) => s.type)).toEqual([
      'hero',
      'rating',
      'products',
      'products',
      'offer',
      'products',
      'why',
      'videoReviews',
      'imageText',
      'faq',
    ])
    // Parsing strips unknown keys; equality proves the seed has no typo'd or stale field.
    expect(doc).toEqual(raw)
  })

  it('seed home has unique section ids', () => {
    const ids = HomeDocSchema.parse(seed('home')).sections.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('seed settings is valid', () => {
    const raw = seed('settings')
    const settings = SettingsSchema.parse(raw)

    expect(settings.topbarMessages).toHaveLength(4)
    expect(settings).toMatchObject({
      freeShippingThreshold: 39,
      giftThreshold: 20,
      shipping: { econtOffice: 4.5, speedyOffice: 3.5 },
      company: { eik: '204275889', city: 'гр. Плевен', email: 'info@tiarracosmetics.com', phone: '+359 897 774 441' },
      social: { tiktok: 'https://www.tiktok.com/@lachezar_aleksandrov' },
    })
    expect(settings.footerText).toMatch(/^Tiarra Cosmetics — онлайн магазин/)
    expect(settings).toEqual(raw)
  })

  it('seed navigation is valid', () => {
    const raw = seed('navigation')
    const nav = NavigationSchema.parse(raw)

    expect(nav.menu.map((m) => m.href)).toEqual([
      '/store/category/women',
      '/store/category/men',
      '/store/category/parfimes',
      '/store/category/komplekt',
      '/promo',
      '/promo/za-nas',
      '/promo/kontakti',
    ])
    expect(nav).toEqual(raw)
  })
})

describe('SectionSchema', () => {
  it('unknown section type is rejected', () => {
    const result = SectionSchema.safeParse({ id: 'x', type: 'carousel', enabled: true, data: {} })
    expect(result.success).toBe(false)
  })

  it('rejects a category products section without a category', () => {
    const result = SectionSchema.safeParse({
      id: 'p',
      type: 'products',
      enabled: true,
      data: { title: 'T', subtitle: '', source: 'category', limit: 12 },
    })
    expect(result.success).toBe(false)
  })

  it('rejects a manual products section without slugs', () => {
    const result = SectionSchema.safeParse({
      id: 'p',
      type: 'products',
      enabled: true,
      data: { title: 'T', subtitle: '', source: 'manual', slugs: [], limit: 12 },
    })
    expect(result.success).toBe(false)
  })

  it('rejects a showFrom that is not an ISO date', () => {
    expect(SectionSchema.safeParse({ ...ratingSection(), showFrom: 'tomorrow' }).success).toBe(false)
  })

  it('rejects a rating outside 1 to 5 stars', () => {
    const bad = { ...ratingSection(), data: { stars: 6, score: '6', text: '' } }
    expect(SectionSchema.safeParse(bad).success).toBe(false)
  })
})

describe('SectionSchema: homepage content fields', () => {
  const section = (type: string, data: unknown) => ({ id: 'x', type, enabled: true, data })
  const video = (youtubeId: string) =>
    section('videoReviews', { videos: [{ youtubeId, name: '', stars: 5 }], stats: [] })

  it('accepts the 11-character ids YouTube hands out', () => {
    for (const id of ['IvzJARMgi4A', 'KC2bxFlIVNw', 'zm9opr9-Mtc', 'AZtuO67nA0o', '__________-']) {
      expect(SectionSchema.safeParse(video(id)).success, id).toBe(true)
    }
  })

  it('rejects a youtubeId that could break out of a thumbnail or embed URL', () => {
    for (const id of ['', 'short', 'IvzJARMgi4AX', 'a"onload="x', '../../etc/p', 'IvzJARM/i4A', 'IvzJARM i4A', 'https://x.y', 'IvzJARMgi4\n']) {
      expect(SectionSchema.safeParse(video(id)).success, id).toBe(false)
    }
  })

  it('why takes an optional kicker and a gold word that is part of the title', () => {
    const why = (extra: object) => section('why', { title: 'Пазаруваш спокойно', items: [], ...extra })

    expect(SectionSchema.safeParse(why({})).success).toBe(true)
    expect(SectionSchema.safeParse(why({ kicker: 'Защо Tiarra', titleHighlight: 'спокойно' })).success).toBe(true)
    expect(SectionSchema.safeParse(why({ titleHighlight: 'не е в заглавието' })).success).toBe(false)
  })

  it('faq takes a kicker, a gold word that is part of the title and a help box', () => {
    const faq = (extra: object) => section('faq', { title: 'Често задавани въпроси', items: [], ...extra })

    expect(SectionSchema.safeParse(faq({})).success).toBe(true)
    expect(
      SectionSchema.safeParse(faq({ kicker: 'Въпроси', titleHighlight: 'въпроси', help: { title: 'Не намери отговор?', text: 'Пиши ни.' } }))
        .success,
    ).toBe(true)
    expect(SectionSchema.safeParse(faq({ titleHighlight: 'нещо друго' })).success).toBe(false)
    expect(SectionSchema.safeParse(faq({ help: { title: '', text: 'Пиши ни.' } })).success).toBe(false)
  })

  it('rating takes optional avatar image paths', () => {
    const rating = (extra: object) => section('rating', { stars: 5, score: '5.0', text: 'х', ...extra })

    expect(SectionSchema.safeParse(rating({})).success).toBe(true)
    expect(SectionSchema.safeParse(rating({ avatars: ['site/avatar-1', 'site/avatar-2'] })).success).toBe(true)
    expect(SectionSchema.safeParse(rating({ avatars: [''] })).success).toBe(false)
  })

  it('the seed home uses the new fields the way the live design shows them', () => {
    const doc = HomeDocSchema.parse(seed('home'))
    const find = <T extends Section['type']>(type: T) => doc.sections.find((s) => s.type === type) as Extract<Section, { type: T }>

    expect(find('why').data).toMatchObject({ kicker: 'Защо Tiarra', titleHighlight: 'спокойно' })
    expect(find('faq').data).toMatchObject({ kicker: 'Въпроси', titleHighlight: 'въпроси' })
    expect(find('faq').data.help?.title).toBe('Не намери отговор?')
    expect(find('rating').data.avatars).toHaveLength(5)
  })
})

describe('visibleSections', () => {
  const show = (...sections: Section[]) => visibleSections({ sections }, NOW).length

  it('hides a section with enabled: false', () => {
    expect(show(ratingSection({ enabled: false }))).toBe(0)
  })

  it('hides a section whose showUntil was one minute ago', () => {
    expect(show(ratingSection({ showUntil: minutes(-1) }))).toBe(0)
  })

  it('hides a section whose showFrom is in one hour', () => {
    expect(show(ratingSection({ showFrom: minutes(60) }))).toBe(0)
  })

  it('shows a section whose showFrom was one hour ago and has no showUntil', () => {
    expect(show(ratingSection({ showFrom: minutes(-60) }))).toBe(1)
  })

  it('shows a section with no bounds at all', () => {
    expect(show(ratingSection())).toBe(1)
  })

  it('shows a section inside its window', () => {
    expect(show(ratingSection({ showFrom: minutes(-60), showUntil: minutes(60) }))).toBe(1)
  })

  it('treats showFrom as inclusive and showUntil as exclusive', () => {
    expect(show(ratingSection({ showFrom: NOW.toISOString() }))).toBe(1)
    expect(show(ratingSection({ showUntil: NOW.toISOString() }))).toBe(0)
  })

  it('keeps the order of the sections it keeps', () => {
    const a = { ...ratingSection(), id: 'a' }
    const b = { ...ratingSection({ enabled: false }), id: 'b' }
    const c = { ...ratingSection(), id: 'c' }

    expect(visibleSections({ sections: [a, b, c] }, NOW).map((s) => s.id)).toEqual(['a', 'c'])
  })
})
