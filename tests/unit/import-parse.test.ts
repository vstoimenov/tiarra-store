import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { detectBrand, detectGender } from '@/scripts/import/brand'
import { parsePerfumeNotes } from '@/scripts/import/perfume'
import { parseProductPage } from '@/scripts/import/parse-product'
import { sanitizeDescription } from '@/scripts/import/sanitize'

function fixture(name: string): string {
  return readFileSync(new URL(`../fixtures/${name}.html`, import.meta.url), 'utf8')
}

// The same wrapper the live page uses, around a minimal product JSON.
function pageWith(product: object): string {
  const json = JSON.stringify({ id: 1, url: 'x', title: 'X', price: 1, ...product })
  return `<script>props = { a: 1 }; WebPlatform.Store.renderProduct(root.find('.product-wrapper'), ${json}, { populate: {} })</script>`
}

describe('parseProductPage', () => {
  it('parses a variant product', () => {
    const p = parseProductPage(fixture('product-yodeyma'))

    expect(p.legacyId).toBe(162)
    expect(p.slug).toBe('yodeyma-paris-edp-eau-de-parfum-100-mlher')
    expect(p.title).toBe('YODEYMA Paris EDP Eau de Parfum For Her 100 ml')
    expect(p.optionName).toBe('АРОМАТ')
    expect(p.variants).toHaveLength(10)
    expect(p.variants[0]).toMatchObject({ name: 'BLACK ELIXIR', price: 29.9, compareAtPrice: 34.9, stock: 2 })
    expect(p.variants[1]).toMatchObject({ name: 'BOREAL', price: 34.9, compareAtPrice: null, stock: 1 })
    expect(p.variants.find((v) => v.name === 'LINET')?.stock).toBe(0)
    expect(p.variants.every((v) => v.name === v.name.trim())).toBe(true)
    expect(p.categories.map((c) => c.slug)).toEqual(['women', 'parfimes', 'тяло-и-аромати'])
    expect(p.categories[2]).toEqual({ legacyId: 14, slug: 'тяло-и-аромати', name: 'ТЯЛО И АРОМАТИ' })
    expect(p.images).toHaveLength(10)
    expect(p.images[0].sourceUrl.startsWith('https://content.app-sources.com/s/908012564280219571/uploads/')).toBe(true)
  })

  it('keeps the product-level price mapping and untracked stock on a variant product', () => {
    const p = parseProductPage(fixture('product-yodeyma'))

    expect(p.price).toBe(29.9)
    expect(p.compareAtPrice).toBe(34.9)
    expect(p.stock).toBeNull()
    expect(p.seoDescription).toBe('')
  })

  it('encodes each path segment of an image url and keeps the slashes', () => {
    const p = parseProductPage(fixture('product-yodeyma'))

    expect(p.images[0].sourceUrl).toBe(
      'https://content.app-sources.com/s/908012564280219571/uploads/%D0%98%D0%B7%D0%BE%D0%B1%D1%80%D0%B0%D0%B6%D0%B5%D0%BD%D0%B8%D1%8F/10-black-opium-ysl-yves-saint-laurent-2761996.jpg',
    )
    expect(p.images[0].alt).toBe(p.title)
  })

  it('takes the variant image from the first variation, even when the stored key has a trailing space', () => {
    const p = parseProductPage(fixture('product-yodeyma'))

    expect(p.variants[0].imageSourceUrl).toBe(p.images[0].sourceUrl)
    const nya = p.variants.find((v) => v.name === 'NYA')
    expect(nya?.imageSourceUrl).toBe(
      'https://content.app-sources.com/s/908012564280219571/uploads/%D0%98%D0%B7%D0%BE%D0%B1%D1%80%D0%B0%D0%B6%D0%B5%D0%BD%D0%B8%D1%8F/Gemini_Generated_Image_93chi393chi393ch-2761997.jpg',
    )
    expect(p.variants.every((v) => v.imageSourceUrl !== null)).toBe(true)
  })

  it('parses a simple product', () => {
    const p = parseProductPage(fixture('product-simple'))

    expect(p.legacyId).toBe(31)
    expect(p.price).toBe(10.5)
    expect(p.compareAtPrice).toBeNull()
    expect(p.stock).toBe(1)
    expect(p.optionName).toBeNull()
    expect(p.variants).toEqual([])
    expect(p.categories.map((c) => c.slug)).toEqual(['men', 'грижа-за-коса'])
    expect(p.categories[1].name).toBe('ГРИЖА ЗА КОСА')
  })

  it('maps an on-sale simple product to price and compareAtPrice', () => {
    const p = parseProductPage(fixture('product-redone'))

    expect(p.legacyId).toBe(161)
    expect(p.price).toBe(7.9)
    expect(p.compareAtPrice).toBe(9.9)
    expect(p.stock).toBe(2)
  })

  it('sanitizes the description it returns', () => {
    const p = parseProductPage(fixture('product-redone'))

    expect(p.descriptionHtml).toContain('<p>')
    expect(p.descriptionHtml).not.toMatch(/style=|<span|<script/)
    expect(p.descriptionHtml).toContain('Връхни нотки')
  })

  it('finds the end of the JSON even when strings contain braces and quotes', () => {
    const p = parseProductPage(pageWith({ title: 'A } {"b": 1} \\" end', seoDescription: ' short ' }))

    expect(p.title).toBe('A } {"b": 1} \\" end')
    expect(p.seoDescription).toBe('short')
  })

  it('throws a clear error when the page has no product data', () => {
    expect(() => parseProductPage('<html><body>403</body></html>')).toThrow(/renderProduct/)
  })
})

describe('detectBrand', () => {
  it('matches the start of the title, case-insensitively, and returns the canonical name', () => {
    expect(detectBrand('NISH LADY Сребърна грижа шампоан')).toBe('NISH LADY')
    expect(detectBrand('Nish Man Hair Styling Cream 100 ml')).toBe('NISH MAN')
    expect(detectBrand('NishMan Hair Styling Cream')).toBe('NISH MAN')
    expect(detectBrand('American Crew Помада за коса 85 ml')).toBe('AMERICAN CREW')
    expect(detectBrand('YODEYMA Paris EDP Eau de Parfum For Her 100 ml')).toBe('YODEYMA')
    expect(detectBrand('RedOne Aftershave Natural Cologne 400 ml')).toBe('REDONE')
  })

  it('recognises Princess, SIEM and Gillette', () => {
    expect(detectBrand('Princess Шампоан против пърхот със сяра 300 ml')).toBe('PRINCESS')
    expect(detectBrand('SIEM Ароматен душ гел за тяло 500 ml')).toBe('SIEM')
    expect(detectBrand('Gillette Platinum ножчета')).toBe('GILLETTE')
  })

  it('recognises the live Gillette title, which names the product type before the brand', () => {
    expect(detectBrand('Ножчета за бръснене - Gillette Platinum, 10 бр. x 5 ножчета')).toBe('GILLETTE')
  })

  it('keeps the new brands to whole words', () => {
    expect(detectBrand('Siemens душ')).toBeNull()
    expect(detectBrand('Princesses шампоан')).toBeNull()
  })

  it('returns null for an unknown brand, or a brand that is not at the start', () => {
    expect(detectBrand('Ножчета за бръснене')).toBeNull()
    expect(detectBrand('Подаръчен комплект Reuzel')).toBeNull()
    expect(detectBrand('Depotx крем')).toBeNull()
  })
})

describe('detectGender', () => {
  it('uses the women and men categories first', () => {
    expect(detectGender(['women', 'parfimes'], 'YODEYMA')).toBe('female')
    expect(detectGender(['men'], null)).toBe('male')
    expect(detectGender(['women', 'men'], null)).toBe('unisex')
    expect(detectGender(['men', 'women'], 'NISH LADY')).toBe('unisex')
  })

  it('falls back to the brand when no gender category is present', () => {
    expect(detectGender(['грижа-за-коса'], 'REUZEL')).toBe('male')
    expect(detectGender(['грижа-за-коса'], 'NISH LADY')).toBe('female')
    for (const brand of ['NISH MAN', 'AMERICAN CREW', 'BARBURYS', 'STMNT']) {
      expect(detectGender([], brand)).toBe('male')
    }
    expect(detectGender([], 'YODEYMA')).toBe('unisex')
    expect(detectGender([], null)).toBe('unisex')
  })
})

describe('parsePerfumeNotes', () => {
  it('reads the three notes from the redone fixture description', () => {
    const { descriptionHtml } = parseProductPage(fixture('product-redone'))
    const perfume = parsePerfumeNotes(descriptionHtml)

    expect(perfume?.top?.startsWith('Зрели и нежни акорди на ананас')).toBe(true)
    expect(perfume?.heart?.startsWith('Освежаващ и хладен микс')).toBe(true)
    expect(perfume?.base?.startsWith('Чувствен мускус')).toBe(true)
  })

  it('also works on the raw, unsanitized description html', () => {
    const raw = '<p><span style="x">• Връхни нотки: Бергамот.</span></p><p>• Базови нотки: Мускус&nbsp;и амбра</p>'

    expect(parsePerfumeNotes(raw)).toEqual({ top: 'Бергамот', base: 'Мускус и амбра' })
  })

  it('splits notes that share one paragraph at the bullet and at the next label', () => {
    const html = '<p>Връхни нотки: бергамот, лимон • Сърдечни нотки: роза Базови нотки: мускус</p>'

    expect(parsePerfumeNotes(html)).toEqual({ top: 'Бергамот, лимон', heart: 'Роза', base: 'Мускус' })
  })

  it('accepts the label synonyms and reads aroma and volume', () => {
    const html =
      '<p>Аромат: Black Opium</p><p>Обем: 100 мл</p>' +
      '<p>Горни нотки: кафе</p><p>Средни нотки: жасмин</p><p>Основни нотки: ванилия</p>'

    expect(parsePerfumeNotes(html)).toEqual({
      top: 'Кафе',
      heart: 'Жасмин',
      base: 'Ванилия',
      aroma: 'Black Opium',
      volume: '100 мл',
    })
  })

  it('only reads the aroma label at the start of a paragraph', () => {
    const html =
      '<p>Любим Аромат: Aqua</p><p>• Аромат: Black Opium</p>' +
      '<p>Връхни нотки: цитрус</p><p>Базови нотки: ветивер</p>'

    expect(parsePerfumeNotes(html)?.aroma).toBe('Black Opium')
    expect(parsePerfumeNotes('<p>Любим Аромат: Aqua</p><p>Връхни нотки: а</p><p>Базови нотки: б</p>')?.aroma).toBeUndefined()
  })

  it('keeps only the first part of a note that continues after a dash', () => {
    const html = '<p>Връхни нотки: розов пипер, круша — ярко начало;</p><p>Базови нотки: ветивер</p>'

    expect(parsePerfumeNotes(html)).toEqual({ top: 'Розов пипер, круша', base: 'Ветивер' })
  })

  it('returns null when fewer than two notes are found', () => {
    expect(parsePerfumeNotes('<p>Без нотки</p>')).toBeNull()
    expect(parsePerfumeNotes('<p>Връхни нотки: цитрус</p><p>Аромат: Aqua</p>')).toBeNull()
  })

  it('does not treat the plural "Аромати:" list heading as the aroma label', () => {
    const { descriptionHtml } = parseProductPage(fixture('product-yodeyma'))

    expect(parsePerfumeNotes(descriptionHtml)).toBeNull()
  })
})

describe('sanitizeDescription', () => {
  it('drops styles and scripts', () => {
    expect(sanitizeDescription('<p style="color:#888">a<script>x</script></p>')).toBe('<p>a</p>')
  })

  it('keeps the allowed formatting tags and only href on links', () => {
    const html =
      '<h2>T</h2><ul><li><strong>a</strong> <em>b</em></li></ul>' +
      '<p><a href="https://tiarracosmetics.com/x" onclick="x()" target="_blank">l</a></p>'

    expect(sanitizeDescription(html)).toBe(
      '<h2>T</h2><ul><li><strong>a</strong> <em>b</em></li></ul><p><a href="https://tiarracosmetics.com/x">l</a></p>',
    )
  })

  it('removes unknown wrappers but keeps their text, and drops javascript: links and images', () => {
    expect(sanitizeDescription('<div><span style="x">t</span><img src="a.png"></div>')).toBe('t')
    expect(sanitizeDescription('<p><a href="javascript:alert(1)">x</a></p>')).toBe('<p><a>x</a></p>')
  })
})
