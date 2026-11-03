import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchLive, liveProductUrls, parseSitemapLocs, parseSitemapUrls } from '@/scripts/import/fetch-live'

const SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://tiarracosmetics.com</loc></url>
  <url><loc>https://tiarracosmetics.com/store</loc></url>
  <url><loc>https://tiarracosmetics.com/blog/blog-post-one</loc></url>
  <url><loc>https://tiarracosmetics.com/store/reuzel</loc></url>
  <url><loc>https://tiarracosmetics.com/store/category/women</loc></url>
  <url><loc>https://tiarracosmetics.com/store/category/%D0%B3%D1%80%D0%B8%D0%B6%D0%B0-%D0%B7%D0%B0-%D0%BA%D0%BE%D1%81%D0%B0</loc></url>
  <url><loc>https://tiarracosmetics.com/store/nish-lady-pearl-beach</loc></url>
  <url><loc>https://tiarracosmetics.com/store/reuzel</loc></url>
</urlset>`

describe('parseSitemapLocs', () => {
  it('lists every address once, in sitemap order, with the xml escapes undone', () => {
    const xml = `<urlset>
      <url><loc>https://tiarracosmetics.com</loc></url>
      <url><loc>
        https://tiarracosmetics.com/store/reuzel
      </loc></url>
      <url><loc>https://tiarracosmetics.com/store?a=1&amp;b=2</loc></url>
      <url><loc>https://tiarracosmetics.com/store/reuzel</loc></url>
    </urlset>`

    expect(parseSitemapLocs(xml)).toEqual([
      'https://tiarracosmetics.com',
      'https://tiarracosmetics.com/store/reuzel',
      'https://tiarracosmetics.com/store?a=1&b=2',
    ])
  })
})

describe('parseSitemapUrls', () => {
  it('keeps product pages, drops categories and other pages, and removes duplicates', () => {
    expect(parseSitemapUrls(SITEMAP)).toEqual([
      'https://tiarracosmetics.com/store/reuzel',
      'https://tiarracosmetics.com/store/nish-lady-pearl-beach',
    ])
  })
})

describe('fetchLive', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  /** Runs fetchLive to the end on fake timers; resolves to the body or the error. */
  async function run(url: string): Promise<{ body?: string; error?: Error }> {
    const outcome = fetchLive(url).then(
      (body) => ({ body }),
      (error: Error) => ({ error }),
    )
    await vi.runAllTimersAsync()
    return outcome
  }

  it('sends the browser user agent and asks for html', async () => {
    fetchMock.mockResolvedValue(new Response('<html>ok</html>', { status: 200 }))

    const { body } = await run('https://tiarracosmetics.com/store/a')

    expect(body).toBe('<html>ok</html>')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://tiarracosmetics.com/store/a')
    expect(init.headers['User-Agent']).toMatch(/^Mozilla\/5\.0 .*Chrome\/141/)
    expect(init.headers.Accept).toBe('text/html')
  })

  it('retries a server error and a dropped connection, then returns the page', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(new Response('page', { status: 200 }))

    const { body } = await run('https://tiarracosmetics.com/store/b')

    expect(body).toBe('page')
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('gives up after 3 retries and reports the status', async () => {
    fetchMock.mockImplementation(async () => new Response('', { status: 502 }))

    const { error } = await run('https://tiarracosmetics.com/store/c')

    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(error?.message).toContain('502')
  })

  it('does not retry a missing page or a blocked request', async () => {
    fetchMock.mockImplementation(async () => new Response('', { status: 404 }))

    const { error } = await run('https://tiarracosmetics.com/store/d')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(error?.message).toContain('404')
  })

  it('waits at least 150 ms between two calls', async () => {
    const starts: number[] = []
    fetchMock.mockImplementation(async () => {
      starts.push(Date.now())
      return new Response('x', { status: 200 })
    })

    await run('https://tiarracosmetics.com/store/e')
    await run('https://tiarracosmetics.com/store/f')

    expect(starts).toHaveLength(2)
    expect(starts[1] - starts[0]).toBeGreaterThanOrEqual(150)
  })
})

describe('liveProductUrls', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('names the sitemap url when it cannot be read', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })))

    await expect(liveProductUrls()).rejects.toThrow(/sitemap\.xml: .*404/)
  })

  it('throws when the sitemap lists no product page, so an import cannot succeed on nothing', async () => {
    const sitemap = `<urlset>
      <url><loc>https://tiarracosmetics.com</loc></url>
      <url><loc>https://tiarracosmetics.com/store/category/women</loc></url>
    </urlset>`
    vi.stubGlobal('fetch', vi.fn(async () => new Response(sitemap, { status: 200 })))

    await expect(liveProductUrls()).rejects.toThrow(/sitemap\.xml: no product pages/)
  })

  it('reads the product pages from the live sitemap', async () => {
    const requested: string[] = []
    vi.stubGlobal('fetch', async (url: string) => {
      requested.push(url)
      return new Response(SITEMAP, { status: 200 })
    })

    expect(await liveProductUrls()).toHaveLength(2)
    expect(requested).toEqual(['https://tiarracosmetics.com/sitemap.xml'])
  })
})
