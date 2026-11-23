import { expect, test, type Page } from '@playwright/test'

const LEGAL = ['obshti-usloviya', 'dostavka-plashtane', 'vrashtane-zamyana', 'poveritelnost', 'biskvitki']

const canonicalOf = (page: Page) => page.locator('link[rel="canonical"]').getAttribute('href')
const ogImageOf = (page: Page) => page.locator('meta[property="og:image"]').getAttribute('content')

test('every legal page renders its title as the heading and its text', async ({ page }) => {
  const headings: Record<string, string> = {
    'obshti-usloviya': 'Общи условия',
    'dostavka-plashtane': 'Доставка и плащане',
    'vrashtane-zamyana': 'Връщане и замяна',
    poveritelnost: 'Политика за поверителност',
    biskvitki: 'Политика за бисквитки',
  }
  for (const slug of LEGAL) {
    const response = await page.goto(`/${slug}`)

    expect(response?.status(), slug).toBe(200)
    await expect(page.getByRole('heading', { level: 1 }), slug).toHaveText(headings[slug])
    await expect(page, slug).toHaveTitle(`${headings[slug]} | Tiarra Cosmetics`)
    expect((await page.getByTestId('content-body').innerText()).length, slug).toBeGreaterThan(200)
  }
})

test('a page that is not one of the five is a 404', async ({ request }) => {
  for (const path of ['/nqma-takava', '/za-nas', '/kontakti']) {
    expect((await request.get(path)).status(), path).toBe(404)
  }
})

test('the text of a content page is readable: links underlined, line height above 1', async ({ page }) => {
  await page.goto('/poveritelnost')

  const body = page.getByTestId('content-body')
  const text = body.locator('p').first()
  const lineHeight = await text.evaluate((el) => parseFloat(getComputedStyle(el).lineHeight) / parseFloat(getComputedStyle(el).fontSize))
  expect(lineHeight).toBeGreaterThanOrEqual(1.4)

  const link = body.locator('a').first()
  await expect(link).toBeVisible()
  expect(await link.evaluate((el) => getComputedStyle(el).textDecorationLine)).toBe('underline')
})

test('/promo/kontakti shows the phone and the email as links', async ({ page }) => {
  const response = await page.goto('/promo/kontakti')

  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Контакти')
  await expect(page.getByTestId('content-body').locator('a[href^="tel:"]')).toHaveAttribute('href', 'tel:+359897774441')
  await expect(page.getByTestId('content-body').locator('a[href^="mailto:"]')).toHaveAttribute('href', 'mailto:info@tiarracosmetics.com')
})

test('/promo/za-nas tells the founder story', async ({ page }) => {
  const response = await page.goto('/promo/za-nas')

  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('За нас')
  await expect(page.getByTestId('content-body')).toContainText('Лъчезар Александров')
})

test('every page carries a canonical address and an Open Graph image', async ({ page }) => {
  const origin = 'http://localhost:3100'
  await page.goto('/store')
  const categories = await page.getByRole('navigation', { name: /категори/i }).getByRole('link').evaluateAll(links => links.map(link => link.getAttribute('href')!).filter(href => href.startsWith('/store/category/')))
  const paths = ['/', '/store', '/promo', '/promo/za-nas', '/promo/kontakti', '/obshti-usloviya', ...categories.slice(0, 2)]

  for (const path of paths) {
    await page.goto(path)

    expect(await canonicalOf(page), path).toBe(path === '/' ? origin : `${origin}${path}`)
    const image = await ogImageOf(page)
    expect(image, path).toMatch(/^https?:\/\//)
    const response = await page.request.get(image!)
    expect(response.ok(), `Open Graph image for ${path}`).toBe(true)
    expect(response.headers()['content-type']).toMatch(/^image\//)
    await expect(page.locator('meta[name="description"]'), path).toHaveAttribute('content', /.{20,}/)
  }
})

test('the old shop addresses answer a 301 to the page that took their place', async ({ request }) => {
  const redirects: [string, string][] = [
    ['/blog', '/'],
    ['/blog/blog-post-one', '/'],
    ['/about-us', '/promo/za-nas'],
    ['/contact-us', '/promo/kontakti'],
    ['/special-deals', '/promo'],
    ['/dsa', '/'],
    ['/shipping-terms', '/dostavka-plashtane'],
    ['/signin', '/'],
  ]
  for (const [from, to] of redirects) {
    const response = await request.get(from, { maxRedirects: 0 })

    expect(response.status(), from).toBe(301)
    expect(new URL(response.headers()['location'], 'http://localhost:3100').pathname, from).toBe(to)
  }
})

test('outside production every page says noindex, and robots.txt closes the site', async ({ request }) => {
  for (const path of ['/', '/store', '/obshti-usloviya', '/nqma-takava']) {
    const response = await request.get(path)
    expect(response.headers()['x-robots-tag'], path).toBe('noindex, nofollow')
  }

  const robots = await (await request.get('/robots.txt')).text()
  expect(robots).toMatch(/User-Agent: \*/i)
  expect(robots).toMatch(/Disallow: \//)
  expect(robots).not.toMatch(/Sitemap:/i)
})

test('the sitemap lists the pages, published categories and every current product', async ({ request, page }) => {
  const xml = await (await request.get('/sitemap.xml')).text()
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])

  for (const path of ['/', '/store', '/promo', '/promo/za-nas', '/promo/kontakti', ...LEGAL.map((s) => `/${s}`)]) {
    expect(locs, path).toContain(path === '/' ? 'http://localhost:3100' : `http://localhost:3100${path}`)
  }
  const catalog = await (await request.get('/api/catalog')).json() as { slug: string }[]
  const productUrls = catalog.map(product => `http://localhost:3100/store/${encodeURIComponent(product.slug)}`).sort()
  expect(locs.filter(loc => /\/store\/(?!category\/)[^/]+$/.test(loc)).sort()).toEqual(productUrls)
  await page.goto('/store')
  const categories = await page.getByRole('navigation', { name: /категори/i }).getByRole('link').evaluateAll(links => links.map(link => link.getAttribute('href')!).filter(href => href.startsWith('/store/category/')))
  expect(locs.filter(loc => loc.includes('/store/category/')).sort()).toEqual(categories.map(path => new URL(path, 'http://localhost:3100').href).sort())
  expect(locs.filter((loc) => /[^\x20-\x7e]/.test(loc))).toEqual([])
  expect(new Set(locs).size).toBe(locs.length)
  expect(xml).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}T/)
})

test('category chips link to published categories in sitemap order', async ({ page, request }) => {
  await page.goto('/store')
  const hrefs = await page.getByRole('navigation', { name: /категори/i }).getByRole('link').evaluateAll(links =>
    links.map(link => new URL(link.getAttribute('href')!, location.origin).href).filter(href => href.includes('/store/category/')),
  )
  const xml = await (await request.get('/sitemap.xml')).text()
  const categories = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]).filter(url => url.includes('/store/category/'))
  expect(hrefs).toEqual(categories)
  expect(new Set(hrefs).size).toBe(hrefs.length)
})
