import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

// The seed files are what `pnpm seed:site` writes to the dev database, so they are what the layout shows.
const seed = <T>(name: string): T => JSON.parse(readFileSync(new URL(`../../seed/${name}.json`, import.meta.url), 'utf8')) as T
const settings = seed<{ topbarMessages: string[]; company: { legalName: string; eik: string; city: string } }>('settings')
const navigation = seed<{ menu: { label: string; href: string }[] }>('navigation')

test('topbar shows a message on one line at 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/')

  const message = page.getByTestId('topbar-message')
  await expect(message).toBeVisible()
  expect(settings.topbarMessages).toContain((await message.textContent())?.trim())

  // The fit() shrink runs after hydration, so poll until the text no longer overflows.
  await expect
    .poll(() => message.evaluate((el) => el.scrollWidth <= el.clientWidth + 1), { message: 'message fits on one line' })
    .toBe(true)
})

test('topbar next arrow shows each message in turn, each on one line', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/')

  const message = page.getByTestId('topbar-message')
  const seen: string[] = []
  for (let i = 0; i < settings.topbarMessages.length; i++) {
    // The text only changes after the 300 ms fade, so wait for a message not seen yet.
    await expect.poll(async () => (await message.textContent())?.trim()).not.toBeFalsy()
    const text = (await message.textContent())!.trim()
    expect(seen).not.toContain(text)
    seen.push(text)
    await expect.poll(() => message.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
    await page.getByRole('button', { name: 'Следващо' }).click()
    await expect(message).not.toHaveText(text)
  }
  expect([...seen].sort()).toEqual([...settings.topbarMessages].sort())
})

test('topbar shrinks the font, never below 10px, when the message is too wide', async ({ page }) => {
  // 300px leaves 232px for the text, less than the longest message needs at 12.5px.
  await page.setViewportSize({ width: 300, height: 800 })
  await page.goto('/')

  const message = page.getByTestId('topbar-message')
  await expect.poll(() => message.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
  const fontSize = await message.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
  expect(fontSize).toBeLessThan(12.5)
  expect(fontSize).toBeGreaterThanOrEqual(10)
})

test('menu has 7 links in order', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')

  const links = page.getByRole('navigation', { name: 'Основно меню' }).getByRole('link')
  await expect(links).toHaveCount(7)
  expect(await links.allTextContents()).toEqual(navigation.menu.map((item) => item.label))
  expect(await links.evaluateAll((els) => els.map((el) => el.getAttribute('href')))).toEqual(
    navigation.menu.map((item) => item.href),
  )
})

test('header has the search form and the cart link', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')

  const search = page.getByRole('banner').getByRole('search')
  await expect(search).toHaveAttribute('action', '/store')
  await expect(search).toHaveAttribute('method', /get/i)
  await expect(search.getByRole('searchbox')).toHaveAttribute('name', 'q')
  await expect(page.getByRole('banner').getByRole('link', { name: 'Количка' })).toHaveAttribute('href', '/store/cart')
})

test('mobile menu keeps За него as a direct link and closes on Escape', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')

  const drawer = page.getByRole('navigation', { name: 'Мобилно меню' })
  await expect(drawer).toBeHidden()
  await page.getByRole('button', { name: 'Меню' }).click()
  await expect(drawer).toBeVisible()
  expect(await drawer.getByRole('link').allTextContents()).toEqual(navigation.menu.map((item) => item.label))
  await expect(drawer.getByRole('link', { name: 'ЗА НЕГО', exact: true })).toHaveAttribute('href', '/store/category/men')
  await expect(drawer.getByRole('link', { name: 'Всички за него', exact: true })).toHaveCount(0)

  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()
})

test('footer shows the company line', async ({ page }) => {
  await page.goto('/')

  const { legalName, eik, city } = settings.company
  await expect(page.getByRole('contentinfo')).toContainText(`© 2026 Tiarra Cosmetics® · ${legalName} · ЕИК ${eik} · ${city}`)
})

test('footer links come from the navigation document', async ({ page }) => {
  const footer = page.getByRole('contentinfo')
  await page.goto('/')

  const expected = seed<{ footer: { title: string; links: { label: string; href: string }[] }[] }>('navigation').footer
  for (const group of expected) {
    await expect(footer.getByRole('heading', { name: group.title, exact: true })).toBeVisible()
    for (const link of group.links) {
      await expect(footer.getByRole('link', { name: link.label, exact: true })).toHaveAttribute('href', link.href)
    }
  }
})

test('unknown page is 404', async ({ page }) => {
  const response = await page.goto('/no-such-page')

  expect(response?.status()).toBe(404)
  await expect(page.getByRole('heading', { name: 'Страницата не е намерена' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Към началото' })).toHaveAttribute('href', '/')
})

test('the favicon is linked in the head and served as a png', async ({ page, request }) => {
  await page.goto('/')

  const href = await page.locator('head link[rel="icon"]').first().getAttribute('href')
  expect(href).toMatch(/^\/icon\.png/)

  const response = await request.get(href!)
  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toContain('image/png')
})
