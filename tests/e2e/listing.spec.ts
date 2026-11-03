import { expect, test, type Locator, type Page } from '@playwright/test'

const cardsOf = (page: Page) => page.locator('article[data-gender]')
const showMore = (page: Page) => page.getByRole('button', { name: 'Покажи още' })

/** Euro amounts in a card, in page order: `29,90 €` is 29.9. */
const pricesIn = (text: string) => (text.match(/\d+,\d{2}(?=\s€)/g) ?? []).map((p) => Number(p.replace(',', '.')))

// The grid is hydrated after the HTML arrives, and a click before that does nothing: click until the page reacts.
async function clickUntilMore(page: Page, expected: number) {
  await expect(async () => {
    await showMore(page).click()
    expect(await cardsOf(page).count()).toBeGreaterThan(expected)
  }).toPass()
}

test('encoded cyrillic category renders', async ({ page }) => {
  const response = await page.goto('/store/category/%D0%B3%D1%80%D0%B8%D0%B6%D0%B0-%D0%B7%D0%B0-%D0%BA%D0%BE%D1%81%D0%B0')

  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ГРИЖА ЗА КОСА')
  expect(await cardsOf(page).count()).toBeGreaterThan(0)
  await expect(page).toHaveTitle(/ГРИЖА ЗА КОСА/)
})

test('the other cyrillic categories render too', async ({ page }) => {
  for (const [slug, name] of [
    ['тяло-и-аромати', 'ТЯЛО И АРОМАТИ'],
    ['брада-и-мустаци', 'БРАДА И МУСТАЦИ'],
  ]) {
    const response = await page.goto(`/store/category/${encodeURIComponent(slug)}`)
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name)
    expect(await cardsOf(page).count()).toBeGreaterThan(0)
  }
})

test('a latin category renders with its name as the heading', async ({ page }) => {
  const response = await page.goto('/store/category/women')

  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ДАМСКА')
  expect(await cardsOf(page).count()).toBeGreaterThan(0)
})

test('an unknown category is 404', async ({ page }) => {
  const response = await page.goto('/store/category/no-such-category')

  expect(response?.status()).toBe(404)
})

test('category links lead to every category, Cyrillic ones included', async ({ page }) => {
  await page.goto('/store')

  const nav = page.getByRole('navigation', { name: 'Категории' })
  await expect(nav.getByRole('link')).toHaveCount(8) // „Всички продукти“ and the 7 categories
  await nav.getByRole('link', { name: 'ГРИЖА ЗА КОСА' }).click()
  await expect(page).toHaveURL(/\/store\/category\/.+/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ГРИЖА ЗА КОСА')
  await expect(nav.getByRole('link', { name: 'ГРИЖА ЗА КОСА' })).toHaveAttribute('aria-current', 'page')
})

test('/store has a heading and a title', async ({ page }) => {
  await page.goto('/store')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Всички продукти')
  await expect(page).toHaveTitle(/Всички продукти/)
})

test('show more', async ({ page }) => {
  await page.goto('/store')

  await expect(cardsOf(page)).toHaveCount(24)
  await clickUntilMore(page, 24)
  expect(await cardsOf(page).count()).toBeGreaterThan(24)
})

test('show more keeps adding 24 until every product is shown, then goes away', async ({ page }) => {
  await page.goto('/store')

  await expect(cardsOf(page)).toHaveCount(24)
  await clickUntilMore(page, 24)
  await expect(cardsOf(page)).toHaveCount(48)
  // The button is gone once there is nothing more to add.
  while (await showMore(page).count()) await showMore(page).click()
  expect(await cardsOf(page).count()).toBeGreaterThan(48)
  await expect(showMore(page)).toHaveCount(0)
})

test('the first 24 cards are in the HTML without JavaScript', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto(`${testInfo.project.use.baseURL}/store`)

  await expect(cardsOf(page)).toHaveCount(24)
  await context.close()
})

test('/store?q=reuzel shows only cards whose title contains REUZEL', async ({ page }) => {
  await page.goto('/store?q=reuzel')

  // The filter runs after hydration, so wait for the grid to shrink before reading it.
  const titles = () => cardsOf(page).getByRole('heading').allTextContents()
  await expect.poll(async () => (await titles()).length).toBeLessThan(24)
  const shown = await titles()
  expect(shown.length).toBeGreaterThan(0)
  for (const title of shown) expect(title).toMatch(/reuzel/i)
})

test('the count line says how many cards match', async ({ page }) => {
  await page.goto('/store?q=reuzel')

  await expect.poll(() => cardsOf(page).count()).toBeLessThan(24)
  const shown = await cardsOf(page).count()
  await expect(page.getByTestId('result-count')).toHaveText(`Показват се 1 – ${shown} от ${shown} резултата`)
})

test('a search that matches nothing shows the empty state, and clearing the filters brings the cards back', async ({ page }) => {
  await page.goto('/store?q=xyzxyzxyz')

  await expect(page.getByText('Няма намерени продукти')).toBeVisible()
  await expect(cardsOf(page)).toHaveCount(0)
  await expect(async () => {
    await page.getByRole('button', { name: 'Изчисти филтрите' }).click()
    await expect(cardsOf(page)).toHaveCount(24, { timeout: 1_000 })
  }).toPass()
  await expect(page.getByText('Няма намерени продукти')).toHaveCount(0)
  // The search is gone from the address too, so a reload shows everything.
  expect(new URL(page.url()).searchParams.has('q')).toBe(false)
})

test('the brand filter keeps only that brand', async ({ page }) => {
  await page.goto('/store')

  const brand = page.getByLabel('Марка')
  await expect(brand.locator('option')).not.toHaveCount(1)
  await expect(async () => {
    await brand.selectOption('REUZEL')
    await expect(cardsOf(page)).not.toHaveCount(24, { timeout: 1_000 })
  }).toPass()
  const titles = await cardsOf(page).getByRole('heading').allTextContents()
  expect(titles.length).toBeGreaterThan(0)
  for (const title of titles) expect(title).toMatch(/reuzel/i)
})

test('the brand options are the distinct brands, sorted', async ({ page }) => {
  await page.goto('/store')

  const labels = await page.getByLabel('Марка').locator('option').allTextContents()
  expect(labels[0]).toBe('Всички марки')
  const brands = labels.slice(1)
  expect(brands.length).toBeGreaterThan(1)
  expect(new Set(brands).size).toBe(brands.length)
  expect(brands).toEqual([...brands].sort((a, b) => a.localeCompare(b, 'bg')))
})

async function firstPrices(cards: Locator) {
  return (await cards.allTextContents()).map((text) => pricesIn(text)[0])
}

test('sorting by price goes from the cheapest and from the dearest', async ({ page }) => {
  await page.goto('/store')
  const sort = page.getByLabel('Сортиране по')

  await expect(async () => {
    await sort.selectOption('price-asc')
    const prices = await firstPrices(cardsOf(page))
    expect(prices).toEqual([...prices].sort((a, b) => a - b))
  }).toPass()
  await expect(async () => {
    await sort.selectOption('price-desc')
    const prices = await firstPrices(cardsOf(page))
    expect(prices).toEqual([...prices].sort((a, b) => b - a))
    expect(prices[0]).toBeGreaterThan(prices[prices.length - 1])
  }).toPass()
})

test('sorting by discount puts the biggest discount first', async ({ page }) => {
  await page.goto('/store')

  await expect(async () => {
    await page.getByLabel('Сортиране по').selectOption('discount')
    const badges = (await cardsOf(page).allTextContents()).map((t) => Number(t.match(/-(\d+)%/)?.[1] ?? 0))
    expect(badges[0]).toBeGreaterThan(0)
    expect(badges).toEqual([...badges].sort((a, b) => b - a))
  }).toPass()
})

test('the sort options are in Bulgarian, newest first', async ({ page }) => {
  await page.goto('/store')

  const options = page.getByLabel('Сортиране по').locator('option')
  expect(await options.allTextContents()).toEqual(['Най-нови', 'Цена ↑', 'Цена ↓', 'Най-голяма отстъпка'])
  await expect(page.getByLabel('Сортиране по')).toHaveValue('newest')
})

test('/promo shows only cards with an old price', async ({ page }) => {
  await page.goto('/promo')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Промоции за месеца')
  await expect(page).toHaveTitle(/Промоции за месеца/)
  await expect(cardsOf(page).first()).toBeVisible()
  // Read every card: the page is paged, so keep adding until the button is gone.
  while (await showMore(page).count()) await showMore(page).click()

  const texts = await cardsOf(page).allTextContents()
  expect(texts.length).toBeGreaterThan(0)
  for (const text of texts) {
    expect(text).toMatch(/-\d+%/)
    const [price, oldPrice] = pricesIn(text)
    expect(oldPrice).toBeGreaterThan(price)
  }
  await expect(cardsOf(page).locator('s')).toHaveCount(texts.length)
})

for (const path of ['/store', '/promo', '/store/category/women']) {
  for (const width of [375, 1280]) {
    test(`${path} does not scroll sideways at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.goto(path)

      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
    })
  }
}
