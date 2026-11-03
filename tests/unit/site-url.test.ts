import { afterEach, describe, expect, it, vi } from 'vitest'
import { siteUrl } from '@/lib/site/url'

afterEach(() => vi.unstubAllEnvs())

describe('siteUrl', () => {
  it('is SITE_URL without trailing slashes and surrounding spaces', () => {
    vi.stubEnv('SITE_ENV', 'production')
    vi.stubEnv('SITE_URL', ' https://tiarracosmetics.com// ')

    expect(siteUrl()).toBe('https://tiarracosmetics.com')
  })

  it('throws in production without SITE_URL', () => {
    vi.stubEnv('SITE_ENV', 'production')
    vi.stubEnv('SITE_URL', undefined)

    expect(() => siteUrl()).toThrow(/SITE_URL/)
  })

  it('throws in preview without SITE_URL: canonical links would point at localhost', () => {
    vi.stubEnv('SITE_ENV', 'preview')
    vi.stubEnv('SITE_URL', undefined)

    expect(() => siteUrl()).toThrow(/SITE_URL/)
  })

  it('treats an empty or blank SITE_URL as missing', () => {
    vi.stubEnv('SITE_ENV', 'preview')
    for (const blank of ['', '   ', '/']) {
      vi.stubEnv('SITE_URL', blank)
      expect(() => siteUrl(), JSON.stringify(blank)).toThrow(/SITE_URL/)
    }
  })

  it('falls back to the local address in development', () => {
    vi.stubEnv('SITE_ENV', 'development')
    vi.stubEnv('SITE_URL', undefined)

    expect(siteUrl()).toBe('http://localhost:3100')
  })

  it('falls back to the local address when SITE_ENV is not set', () => {
    vi.stubEnv('SITE_ENV', undefined)
    vi.stubEnv('SITE_URL', undefined)

    expect(siteUrl()).toBe('http://localhost:3100')
  })

  it('uses SITE_URL in development and preview when it is set', () => {
    vi.stubEnv('SITE_URL', 'https://preview.example')
    for (const env of ['development', 'preview']) {
      vi.stubEnv('SITE_ENV', env)
      expect(siteUrl()).toBe('https://preview.example')
    }
  })
})
