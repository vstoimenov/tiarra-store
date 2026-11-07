import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { HomeDocSchema } from '@/lib/sections/schema'

// Guards the hand-written seed content (seed/**) against the mistakes the live site had:
// banned words, links to routes that do not exist, images the seed never imports.

const SEED = new URL('../../seed/', import.meta.url)
const read = (path: string) => readFileSync(new URL(path, SEED), 'utf8')
const readJson = (path: string) => JSON.parse(read(path)) as unknown

interface PageEntry {
  slug: string
  title: string
  seoDescription: string
}
interface ImageEntry {
  path: string
  url: string
}

const pages = readJson('pages.json') as PageEntry[]
const images = readJson('images.json') as ImageEntry[]
const home = HomeDocSchema.parse(readJson('home.json'))
const pageFiles = readdirSync(new URL('pages/', SEED)).filter((f) => f.endsWith('.html'))

/** Every seed file that carries customer-facing text, as [name, content]. */
const allText: [string, string][] = [
  ['home.json', read('home.json')],
  ['settings.json', read('settings.json')],
  ['navigation.json', read('navigation.json')],
  ['pages.json', read('pages.json')],
  ...pageFiles.map((f): [string, string] => [`pages/${f}`, read(`pages/${f}`)]),
]

/** The internal routes the storefront serves (Tasks 8 to 11). */
const KNOWN_ROUTE =
  /^\/(store(\/category\/[^/]+)?|promo(\/za-nas|\/kontakti)?|obshti-usloviya|dostavka-plashtane|vrashtane-zamyana|poveritelnost|biskvitki)?$/

function internalHrefs(text: string): string[] {
  // Covers html attributes (`href="/x"`) and JSON values (`"href": "/x"`).
  return [...text.matchAll(/href"?\s*[:=]\s*\\?"(\/[^"\\]*)/g)].map((m) => m[1])
}

describe('seed copy rules', () => {
  it.each(allText)('%s never uses the word „тест“', (_name, content) => {
    // "тествал" (tried it myself) is a different word; only the standalone word is banned.
    expect(content).not.toMatch(/(?<![\p{L}])тест(?![\p{L}])/iu)
  })

  it.each(allText)('%s never calls the samples „парфюми“', (_name, content) => {
    expect(content).not.toMatch(/мостри[^.<"]*парфюм/iu)
  })

  it('states the thresholds as „над 39 €“ and „над 20 €“', () => {
    const joined = allText.map(([, c]) => c).join('\n')
    expect(joined).toContain('над 39 €')
    expect(joined).toContain('над 20 €')
  })
})

describe('seed links', () => {
  it.each(allText)('%s links only to routes that exist', (_name, content) => {
    const unknown = internalHrefs(content).filter((href) => !KNOWN_ROUTE.test(decodeURIComponent(href)))
    expect(unknown).toEqual([])
  })

  it('does not link to the old ConvertBuilder host', () => {
    for (const [, content] of allText) expect(content).not.toContain('tiarracosmetics.com/store')
  })
})

describe('seed pages', () => {
  it('has a title and a body file for every page, and no other file', () => {
    expect(pages.map((p) => `${p.slug}.html`).sort()).toEqual([...pageFiles].sort())
    expect(pages).toHaveLength(7)
    for (const page of pages) {
      expect(page.title.length).toBeGreaterThan(0)
      expect(page.seoDescription.length).toBeGreaterThan(0)
      expect(read(`pages/${page.slug}.html`).trim().length).toBeGreaterThan(0)
    }
  })

  it('gives „За нас“ the same text as the homepage about section', () => {
    const about = home.sections.find((s) => s.type === 'imageText')
    if (about?.type !== 'imageText') throw new Error('no imageText section')

    expect(read('pages/za-nas.html').trim()).toBe(about.data.bodyHtml.trim())
  })

  it('gives „Контакти“ the phone and the email and no form', () => {
    const body = read('pages/kontakti.html')

    expect(body).toContain('+359 897 774 441')
    expect(body).toContain('info@tiarracosmetics.com')
    expect(body).not.toMatch(/<form|<input/i)
  })

  it('names only the company in the legal texts', () => {
    const legal = ['obshti-usloviya', 'poveritelnost'].map((s) => read(`pages/${s}.html`)).join('\n')

    expect(legal).toContain('„СТИЛИСТ ЛЪКИ" ЕООД')
    expect(legal).toContain('ЕИК 204275889')
    expect(legal).not.toMatch(/Barber/i)
  })
})

describe('seed images', () => {
  it('imports every image path the home document points at, and the logo', () => {
    const imported = images.map((i) => i.path)
    const used = home.sections.flatMap((s) => ('imagePath' in s.data ? [s.data.imagePath] : []))

    expect(used.length).toBeGreaterThan(0)
    for (const path of used) expect(imported).toContain(path)
    expect(imported).toContain('site/logo')
  })

  it('imports the rating avatars', () => {
    const imported = images.map((i) => i.path)
    const rating = home.sections.find((s) => s.type === 'rating')
    if (rating?.type !== 'rating') throw new Error('no rating section')

    expect(rating.data.avatars?.length).toBeGreaterThan(0)
    for (const path of rating.data.avatars ?? []) expect(imported).toContain(path)
  })

  it('lists plain https urls: encoded, without a ?format=webp query', () => {
    for (const { url } of images) {
      expect(url).toMatch(/^https:\/\/[\x21-\x7e]+$/)
      expect(url).not.toContain('?')
    }
  })
})

describe('seed homepage', () => {
  it('keeps the live campaign end of the offer', () => {
    const offer = home.sections.find((s) => s.type === 'offer')
    if (offer?.type !== 'offer') throw new Error('no offer section')

    expect(offer.data.endsAt).toBe('2026-11-30T21:59:59.000Z')
    expect(offer.data).toMatchObject({ oldPrice: 59.9, newPrice: 48, buttonLabel: 'ВЗЕМИ СЕГА' })
  })

  it('has the 10 FAQ items and the 4 reviews videos', () => {
    const faq = home.sections.find((s) => s.type === 'faq')
    const reviews = home.sections.find((s) => s.type === 'videoReviews')

    expect(faq?.type === 'faq' && faq.data.items).toHaveLength(10)
    expect(reviews?.type === 'videoReviews' && reviews.data.videos.map((v) => v.youtubeId)).toEqual([
      'IvzJARMgi4A',
      'KC2bxFlIVNw',
      'zm9opr9-Mtc',
      'AZtuO67nA0o',
    ])
  })
})
