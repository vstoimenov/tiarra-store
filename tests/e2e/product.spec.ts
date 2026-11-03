import { expect, test, type Page } from '@playwright/test'

const YODEYMA = '/store/yodeyma-paris-edp-eau-de-parfum-100-mlher'
const YODEYMA_TITLE = 'YODEYMA Paris EDP Eau de Parfum For Her 100 ml'
const REDONE = '/store/redone-aftershave-natural-cologne-400-ml'
const WAX = '/store/nishman-matova-seriya-vaksa-za-kosa-m1-100-ml'

const buyBox = (page: Page) => page.getByTestId('buybox')
// A variant that is out says so in its name („LINET (изчерпан)“); „M1“ must not match „M10“.
const option = (page: Page, name: string) =>
  buyBox(page).getByRole('radio', { name: new RegExp(`^${name}( \\(изчерпан\\))?$`) })

// The options are hydrated after the HTML arrives, and a click before that is lost: click until the page reacts.
async function choose(page: Page, name: string, price: string) {
  await expect(async () => {
    await option(page, name).check()
    await expect(page.getByTestId('price')).toHaveText(price, { timeout: 500 })
  }).toPass()
}

test('the heading is the product title', async ({ page }) => {
  const response = await page.goto(YODEYMA)

  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(YODEYMA_TITLE)
  await expect(page).toHaveTitle(`${YODEYMA_TITLE} | Tiarra Cosmetics`)
})

test('choosing BOREAL shows 34,90 € and no old price', async ({ page }) => {
  await page.goto(YODEYMA)

  await choose(page, 'BOREAL', '34,90 €')
  await expect(page.getByTestId('old-price')).toHaveCount(0)
  await expect(page.getByTestId('discount')).toHaveCount(0)
})

test('choosing BLACK ELIXIR shows 29,90 €, the old price 34,90 € and -14%', async ({ page }) => {
  await page.goto(YODEYMA)

  await choose(page, 'BOREAL', '34,90 €')
  await choose(page, 'BLACK ELIXIR', '29,90 €')
  await expect(page.getByTestId('old-price')).toHaveText('34,90 €')
  await expect(page.getByTestId('discount')).toHaveText('-14%')
})

test('the option is labelled by the option name', async ({ page }) => {
  await page.goto(YODEYMA)

  await expect(buyBox(page).getByRole('radiogroup', { name: /Аромат/i })).toBeVisible()
})

test('a variant with stock 0 is „Изчерпан“ and disables the button, the others stay buyable', async ({ page }) => {
  await page.goto(YODEYMA)
  const button = buyBox(page).getByRole('button', { name: /Добави в количката|Изчерпан/ })

  await expect(button).toHaveText('Добави в количката')
  await expect(button).toBeEnabled()

  await expect(async () => {
    await option(page, 'LINET').check()
    await expect(button).toHaveText('Изчерпан', { timeout: 500 })
  }).toPass()
  await expect(button).toBeDisabled()

  await choose(page, 'LIDO', '34,90 €')
  await expect(button).toHaveText('Добави в количката')
  await expect(button).toBeEnabled()
})

test('the quantity stops at the stock of the variant', async ({ page }) => {
  await page.goto(YODEYMA)
  const quantity = buyBox(page).getByRole('spinbutton', { name: 'Количество' })

  // BLACK ELIXIR has 2 in stock.
  await expect(quantity).toHaveAttribute('max', '2')
  const more = buyBox(page).getByRole('button', { name: 'Увеличи количеството' })
  await expect(async () => {
    await more.click()
    await expect(quantity).toHaveValue('2', { timeout: 500 })
  }).toPass()
  await expect(more).toBeDisabled()

  // BOREAL has 1: the quantity comes down with it.
  await choose(page, 'BOREAL', '34,90 €')
  await expect(quantity).toHaveAttribute('max', '1')
  await expect(quantity).toHaveValue('1')
})

test('choosing a variant with its own picture changes the main picture', async ({ page }) => {
  await page.goto(YODEYMA)
  const main = page.getByTestId('main-image')
  const before = await main.getAttribute('src')

  await expect(async () => {
    await option(page, 'NYA').check()
    expect(await main.getAttribute('src')).not.toBe(before)
  }).toPass()
})

test('a variant picture outside the gallery still shows as the main picture', async ({ page }) => {
  await page.goto(WAX)
  const main = page.getByTestId('main-image')
  const thumbs = page.getByTestId('thumbnails').getByRole('button')

  // M1 is the first variant in stock and its picture is not one of the thumbnails.
  await expect(option(page, 'M1')).toBeChecked()
  const m1 = await main.getAttribute('src')
  const galleryPaths = await thumbs.evaluateAll((buttons) =>
    buttons.map((b) => b.querySelector('img')?.getAttribute('src') ?? ''),
  )
  expect(galleryPaths.length).toBeGreaterThan(0)
  expect(galleryPaths.some((src) => src.replace(/-\d+\.webp$/, '') === m1?.replace(/-\d+\.webp$/, ''))).toBe(false)

  // M2 has a picture of the gallery; a variant without a picture (M5) keeps whatever is shown.
  let m2 = ''
  await expect(async () => {
    await option(page, 'M2').check()
    m2 = (await main.getAttribute('src')) ?? ''
    expect(m2).not.toBe(m1)
  }).toPass()
  await option(page, 'M5').check()
  await expect(main).toHaveAttribute('src', m2)
})

test('the main picture is eager and high priority, with a srcset and its size', async ({ page }) => {
  await page.goto(YODEYMA)
  const main = page.getByTestId('main-image')

  await expect(main).toHaveAttribute('loading', 'eager')
  await expect(main).toHaveAttribute('fetchpriority', 'high')
  await expect(main).toHaveAttribute('srcset', /400w.*800w.*1200w/)
  await expect(main).toHaveAttribute('width', /\d+/)
  await expect(main).toHaveAttribute('height', /\d+/)
})

test('clicking the main picture opens a zoom; Escape closes it and focus returns', async ({ page }) => {
  await page.goto(YODEYMA)
  const zoom = page.getByRole('button', { name: 'Увеличи снимката' })
  const dialog = page.getByRole('dialog')

  await expect(async () => {
    await zoom.click()
    await expect(dialog).toBeVisible({ timeout: 500 })
  }).toPass()
  await expect(dialog.getByRole('img')).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(zoom).toBeFocused()
})

test('the related products are not for men', async ({ page }) => {
  await page.goto(YODEYMA)
  const cards = page.getByTestId('related').locator('article[data-gender]')

  expect(await cards.count()).toBeGreaterThan(0)
  const genders = await cards.evaluateAll((els) => els.map((el) => el.getAttribute('data-gender')))
  expect(genders.every((g) => g !== 'male')).toBe(true)
  await expect(page.getByTestId('related').getByRole('heading', { level: 2 })).toHaveText('Подобни продукти')
})

test('the structured data has a Product and a BreadcrumbList', async ({ page }) => {
  await page.goto(YODEYMA)
  const text = (await page.locator('script[type="application/ld+json"]').allTextContents()).join('\n')

  expect(text).toContain('"@type":"Product"')
  expect(text).toContain('"@type":"BreadcrumbList"')
  expect(text).toContain('"@type":"AggregateOffer"')
})

test('the breadcrumbs lead home and to the first category', async ({ page }) => {
  await page.goto(YODEYMA)
  const crumbs = page.getByRole('navigation', { name: 'Път до продукта' })

  await expect(crumbs.getByRole('link').first()).toHaveAttribute('href', '/')
  await expect(crumbs.getByRole('link').nth(1)).toHaveAttribute('href', /^\/store\/category\/.+/)
  await expect(crumbs.locator('[aria-current="page"]')).toHaveText(YODEYMA_TITLE)
})

test('the page has a canonical link, an og:image and a description from the text', async ({ page }) => {
  await page.goto(YODEYMA)

  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/store\/yodeyma-paris-edp-eau-de-parfum-100-mlher$/)
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /-1200\.webp$/)
  const description = await page.locator('meta[name="description"]').getAttribute('content')
  expect(description?.length).toBeGreaterThan(40)
  expect(description?.length).toBeLessThanOrEqual(155)
  expect(description).not.toMatch(/[<>]/)
})

test('the trust block shows the gift and free-shipping thresholds from the settings', async ({ page }) => {
  await page.goto(YODEYMA)
  const trust = page.getByTestId('trust')

  await expect(trust).toContainText('Подарък: мостри от нашите продукти')
  await expect(trust).toContainText('над 20 €')
  await expect(trust).toContainText('над 39 €')
  await expect(trust).toContainText('Преглед преди плащане')
  await expect(trust).toContainText('НАЛОЖЕН ПЛАТЕЖ')
  await expect(trust).not.toContainText(/тест/i)
})

test('the share buttons are there, and copy the link where there is no share menu', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  // A desktop browser without the share menu: the link is copied instead.
  await page.addInitScript(() => Object.defineProperty(navigator, 'share', { value: undefined }))
  await page.goto(YODEYMA)
  const share = page.getByTestId('share')

  for (const name of ['Сподели във Facebook', 'Отвори Messenger', 'Отвори Instagram', 'Отвори TikTok']) {
    await expect(share.getByRole('button', { name })).toBeVisible()
  }

  await expect(async () => {
    await share.getByRole('button', { name: 'Отвори Instagram' }).click()
    await expect(share.getByRole('status')).toContainText('Линкът е копиран — постави го в Instagram', { timeout: 500 })
  }).toPass()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\/store\/yodeyma-paris-edp-eau-de-parfum-100-mlher$/)
})

// `window.open` with `noopener` in the features always returns null (HTML spec), whether or not a popup opened.
// The stub does the same, so these tests see what a real browser does: a popup that was opened must not be
// mistaken for a blocked one. Facebook itself is never reached: its address is answered with an empty page.
const FACEBOOK_SHARER = /^https:\/\/www\.facebook\.com\/sharer\/sharer\.php\?u=/

interface OpenCall {
  url: string
  target: string
  features: string
}

// The calls are recorded in the test (not in the page), so they are still there if the page navigates away.
async function stubFacebookAndOpen(page: Page, opens: 'a popup' | 'nothing'): Promise<OpenCall[]> {
  const calls: OpenCall[] = []
  await page.route(FACEBOOK_SHARER, (route) => route.fulfill({ contentType: 'text/html', body: '<title>stub</title>' }))
  await page.exposeFunction('__recordOpen', (url: string, target: string, features: string) => {
    calls.push({ url, target, features })
  })
  await page.addInitScript((result) => {
    const popup = { opener: 'not cleared' as unknown }
    Object.assign(window, { __popup: popup })
    window.open = (url, target, features) => {
      ;(window as unknown as { __recordOpen: (...args: string[]) => void }).__recordOpen(String(url), String(target), String(features))
      if (result === 'nothing' || /noopener/.test(String(features))) return null
      return popup as unknown as Window
    }
  }, opens)
  return calls
}

test('sharing to Facebook opens a popup and the product page stays where it is', async ({ page }) => {
  const calls = await stubFacebookAndOpen(page, 'a popup')
  await page.goto(YODEYMA)

  await expect(async () => {
    await page.getByTestId('share').getByRole('button', { name: 'Сподели във Facebook' }).click()
    expect(calls.length).toBeGreaterThan(0)
  }).toPass()
  await page.waitForTimeout(400) // a wrong fallback navigation would have happened by now

  expect(page.url()).toMatch(new RegExp(`${YODEYMA}$`))
  expect(calls).toHaveLength(1)
  const [call] = calls
  expect(call.url).toMatch(FACEBOOK_SHARER)
  expect(decodeURIComponent(call.url)).toContain(YODEYMA)
  expect(call.target).toBe('_blank')
  expect(call.features).toContain('width=600,height=640')
  expect(call.features).not.toContain('noopener') // that would make window.open answer null, a popup or not
  // The popup must not keep a handle on the shop page.
  expect(await page.evaluate(() => (window as unknown as { __popup: { opener: unknown } }).__popup.opener)).toBeNull()
})

test('when the popup is blocked, sharing to Facebook opens the sharer in the same tab', async ({ page }) => {
  const calls = await stubFacebookAndOpen(page, 'nothing')
  await page.goto(YODEYMA)

  await expect(async () => {
    await page.getByTestId('share').getByRole('button', { name: 'Сподели във Facebook' }).click()
    await expect(page).toHaveURL(FACEBOOK_SHARER, { timeout: 500 })
  }).toPass()
  expect(decodeURIComponent(page.url())).toContain(YODEYMA)
  expect(calls.length).toBeGreaterThan(0)
})

test('the perfume pyramid shows on a perfume with notes', async ({ page }) => {
  await page.goto(REDONE)
  const pyramid = page.getByRole('region', { name: 'Ароматна пирамида' })

  await expect(pyramid).toBeVisible()
  await expect(pyramid).toContainText('Връхни нотки')
  await expect(pyramid).toContainText('Средни нотки')
  await expect(pyramid).toContainText('Базови нотки')
})

test('no pyramid on a product without notes', async ({ page }) => {
  await page.goto(YODEYMA)

  await expect(page.getByRole('region', { name: 'Ароматна пирамида' })).toHaveCount(0)
})

test('the old live url /store/reuzel still works', async ({ page }) => {
  const response = await page.goto('/store/reuzel')

  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('REUZEL')
  await expect(buyBox(page).getByRole('button', { name: /Добави в количката|Изчерпан/ })).toBeVisible()
})

test('an unknown product is 404', async ({ page }) => {
  const response = await page.goto('/store/no-such-product')

  expect(response?.status()).toBe(404)
})

test('the category listings still win over the product route', async ({ page }) => {
  const response = await page.goto('/store/category/women')

  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ДАМСКА')
})

test('a simple product with stock 0 is „Изчерпан“ with the button disabled', async ({ page }) => {
  await page.goto('/store/nishman-balsam-za-kosa-i-brada-milk-mousse-200-ml')
  const button = buyBox(page).getByRole('button', { name: /Добави в количката|Изчерпан/ })

  await expect(button).toHaveText('Изчерпан')
  await expect(button).toBeDisabled()
  await expect(buyBox(page).getByRole('radiogroup')).toHaveCount(0)
})

for (const path of [YODEYMA, REDONE, WAX, '/store/reuzel']) {
  for (const width of [375, 1280]) {
    test(`${path} does not scroll sideways at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(path)

      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow).toBeLessThanOrEqual(0)
    })
  }
}
