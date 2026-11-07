import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

// The seed file is what `pnpm seed:site` wrote to the dev database, so it is what `/` shows.
interface SeedSection {
  id: string
  type: string
  data: Record<string, unknown>
}
const sections = (JSON.parse(readFileSync(new URL('../../seed/home.json', import.meta.url), 'utf8')) as { sections: SeedSection[] })
  .sections
const byId = (id: string) => sections.find((s) => s.id === id)!
const section = (page: Page, id: string) => page.locator(`[data-section="${id}"]`)

const offer = byId('offer').data as { endsAt: string; productSlug: string }
const videos = (byId('video-reviews').data as { videos: { youtubeId: string }[] }).videos

// YouTube is not what these tests are about: answer both hosts locally so they never touch the network.
async function stubYoutube(page: Page) {
  const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
  await page.route('https://i.ytimg.com/**', (route) => route.fulfill({ contentType: 'image/gif', body: gif }))
  await page.route('https://www.youtube-nocookie.com/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>stub</title>' }),
  )
}

test('hero has the promise and sends „За Нея“ to the women category', async ({ page }) => {
  await page.goto('/')

  const hero = section(page, 'hero')
  await expect(hero).toContainText('резултатите, които виждаш при фризьора')
  await expect(hero.getByRole('link', { name: 'За Нея' })).toHaveAttribute('href', '/store/category/women')
  await expect(hero.getByRole('link', { name: 'За Него' })).toHaveAttribute('href', '/store/category/men')
})

test('only the sections after the first screen are skipped by the browser until they are near', async ({ page }) => {
  await page.goto('/')

  const skipped = (id: string) => section(page, id).evaluate((el) => getComputedStyle(el.closest('main > div > *')!).contentVisibility)
  expect(await skipped('hero')).toBe('visible')
  expect(await skipped('rating')).toBe('visible')
  expect(await skipped('bestsellers')).toBe('auto')
  expect(await skipped('faq')).toBe('auto')
  // The offer sits in a row with the kits; the row is what is skipped.
  expect(await skipped('offer')).toBe('auto')
})

test('hero image is eager, high priority and has a srcset', async ({ page }) => {
  await page.goto('/')

  const image = section(page, 'hero').locator('img')
  await expect(image).toHaveAttribute('fetchpriority', 'high')
  await expect(image).not.toHaveAttribute('loading', 'lazy')
  await expect(image).toHaveAttribute('srcset', /400w.*800w.*1200w/)
})

test('page has one h1', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
})

test('homepage sections come in the order of the document', async ({ page }) => {
  await page.goto('/')

  const ids = await page.locator('main [data-section]').evaluateAll((els) => els.map((el) => el.getAttribute('data-section')))
  expect(ids).toEqual(sections.map((s) => s.id))
})

test('rating strip shows the score and the trust line', async ({ page }) => {
  await page.goto('/')

  const rating = section(page, 'rating')
  await expect(rating).toContainText('5.0')
  await expect(rating).toContainText('С доверието на 290+ доволни клиенти')
})

test('the first products section carries the full mixed catalog', async ({ page }) => {
  await page.goto('/')

  const cards = section(page, 'bestsellers').locator('article[data-gender]')
  expect(await cards.count()).toBeGreaterThan(12)
  expect(new Set(await cards.evaluateAll((elements) => elements.map((element) => element.getAttribute('data-gender')))).size).toBeGreaterThan(1)
})

test('the perfumes section has 12 cards and the kits section at most its limit of 9', async ({ page }) => {
  await page.goto('/')

  await expect(section(page, 'perfumes').locator('article[data-gender]')).toHaveCount(12)
  // The category has 8 products (the live page shows the two-variant REUZEL kit twice, to make 9).
  const kits = await section(page, 'kits').locator('article[data-gender]').count()
  expect(kits).toBeGreaterThan(0)
  expect(kits).toBeLessThanOrEqual(9)
})

test('a product card has a lazy image, a title, a price and a link to the product', async ({ page }) => {
  await page.goto('/')

  const card = section(page, 'bestsellers').locator('article[data-gender]').first()
  await expect(card).toHaveAttribute('data-gender', /^(female|male|unisex)$/)
  await expect(card.locator('img')).toHaveAttribute('loading', 'lazy')
  await expect(card.getByRole('heading')).not.toBeEmpty()
  await expect(card).toContainText(/\d+,\d{2} €/)
  await expect(card.getByRole('link').first()).toHaveAttribute('href', /^\/store\/[^/]+$/)
})

test('a discounted card shows the old price and -N%, a full-price card does not', async ({ page }) => {
  await page.goto('/')

  // `/store/<slug>` links are all there is to tell cards apart, so read the old price from the text.
  const cards = section(page, 'bestsellers').locator('article[data-gender]')
  const texts = await cards.allTextContents()
  const discounted = texts.filter((t) => /-\d+%/.test(t))
  expect(discounted.length).toBeGreaterThan(0)
  for (const text of discounted) expect(text.match(/\d+,\d{2}\s€/g)?.length).toBeGreaterThanOrEqual(2)
})

test('the offer shows the new and the old price and links to its product', async ({ page }) => {
  await page.goto('/')

  const box = section(page, 'offer')
  await expect(box).toContainText('48,00 €')
  await expect(box).toContainText('59,90 €')
  await expect(box.getByRole('link', { name: 'ВЗЕМИ СЕГА' })).toHaveAttribute('href', `/store/${offer.productSlug}`)
})

test('the offer countdown runs while the offer is on and the offer stays when it is over', async ({ page }) => {
  const over = Date.now() >= Date.parse(offer.endsAt)
  await page.goto('/')

  const countdown = section(page, 'offer').getByTestId('countdown')
  if (over) {
    await expect(countdown).toHaveCount(0)
    await expect(section(page, 'offer')).toContainText('48,00 €')
  } else {
    await expect(countdown).toBeVisible()
    await expect(countdown.getByText('МИНУТИ')).toBeVisible()
  }
})

test('the countdown hides itself when the clock is past the end, the offer stays', async ({ page }) => {
  // The browser clock is faked here, the server's is not: once the offer is really over the server sends no countdown at all.
  test.skip(Date.now() >= Date.parse(offer.endsAt), 'the offer is over, there is no countdown to hide')
  await page.clock.install({ time: new Date(Date.parse(offer.endsAt) - 5_000) })
  await page.goto('/')

  const countdown = section(page, 'offer').getByTestId('countdown')
  await expect(countdown).toBeVisible()
  await page.clock.fastForward(10_000)
  await expect(countdown).toHaveCount(0)
  await expect(section(page, 'offer')).toContainText('48,00 €')
})

test('the offer keeps its height when the countdown numbers appear', async ({ browser }, testInfo) => {
  // Without JavaScript the page is what the server sent; with it the countdown has started.
  const baseURL = testInfo.project.use.baseURL!
  const heights: number[] = []
  for (const javaScriptEnabled of [false, true]) {
    const context = await browser.newContext({ javaScriptEnabled, viewport: { width: 375, height: 812 } })
    const page = await context.newPage()
    await page.goto(baseURL)
    await page.waitForLoadState('networkidle')
    if (javaScriptEnabled && Date.now() < Date.parse(offer.endsAt)) {
      await expect(section(page, 'offer').getByTestId('countdown').getByText('МИНУТИ')).toBeVisible()
    }
    heights.push((await section(page, 'offer').boundingBox())!.height)
    await context.close()
  }
  expect(heights[1]).toBe(heights[0])
})

test('there are 4 video thumbnails and no iframe until a click', async ({ page }) => {
  await stubYoutube(page)
  await page.goto('/')

  const reviews = section(page, 'video-reviews')
  await expect(reviews.locator('img[src^="https://i.ytimg.com/vi/"]')).toHaveCount(4)
  expect(await reviews.locator('img[src^="https://i.ytimg.com/vi/"]').evaluateAll((els) => els.map((el) => el.getAttribute('src')))).toEqual(
    videos.map((v) => `https://i.ytimg.com/vi/${v.youtubeId}/hqdefault.jpg`),
  )
  await expect(page.locator('iframe')).toHaveCount(0)
})

test('clicking a video thumbnail puts a privacy-friendly player in its place', async ({ page }) => {
  await stubYoutube(page)
  await page.goto('/')

  const reviews = section(page, 'video-reviews')
  await reviews.getByRole('button', { name: /Пусни/ }).first().click()

  const frame = reviews.locator('iframe')
  await expect(frame).toHaveCount(1)
  await expect(frame).toHaveAttribute('src', `https://www.youtube-nocookie.com/embed/${videos[0].youtubeId}?autoplay=1`)
  await expect(reviews.locator('img[src^="https://i.ytimg.com/vi/"]')).toHaveCount(4)
})

test('the video stats show the counters', async ({ page }) => {
  await page.goto('/')

  await expect(section(page, 'video-reviews')).toContainText('290')
  await expect(section(page, 'video-reviews')).toContainText('ДОВОЛНИ КЛИЕНТИ')
  await expect(section(page, 'video-reviews')).toContainText('РЕАЛНА ОЦЕНКА ОТ КЛИЕНТИ')
})

test('the about section has the founder text next to the photo', async ({ page }) => {
  await page.goto('/')

  const about = section(page, 'about')
  await expect(about.getByRole('heading', { level: 2 })).toContainText('Tiarra Cosmetics')
  await expect(about).toContainText('Лъчезар Александров')
  await expect(about.locator('img')).toHaveAttribute('loading', 'lazy')
})

test('the why section has four reasons with an icon each', async ({ page }) => {
  await page.goto('/')

  const why = section(page, 'why')
  await expect(why.getByRole('heading', { level: 2 })).toHaveText('Пазаруваш спокойно')
  await expect(why.getByRole('heading', { level: 3 })).toHaveCount(4)
  await expect(why.locator('svg')).toHaveCount(4)
})

test('every FAQ question opens on click and shows its answer', async ({ page }) => {
  await page.goto('/')

  const faq = section(page, 'faq')
  const items = faq.locator('details')
  await expect(items).toHaveCount(10)

  const first = items.first()
  await expect(first).not.toHaveAttribute('open', '')
  await first.locator('summary').click()
  await expect(first).toHaveAttribute('open', '')
  await expect(first).toContainText('100% оригинални')
})

test('there is a FAQPage in the structured data', async ({ page }) => {
  await page.goto('/')

  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents()
  const types = blocks.map((b) => (JSON.parse(b) as { '@type': string })['@type'])
  expect(types).toContain('FAQPage')

  const faq = JSON.parse(blocks[types.indexOf('FAQPage')]) as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] }
  expect(faq.mainEntity).toHaveLength(10)
  expect(faq.mainEntity[0].acceptedAnswer.text).not.toMatch(/[<>]/)
})

for (const width of [375, 1280]) {
  test(`homepage does not scroll sideways at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await page.goto('/')

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
  })
}
