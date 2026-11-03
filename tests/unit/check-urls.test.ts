import { describe, expect, it } from 'vitest'
import { expectationFor, navigationPaths, rewriteHost } from '@/scripts/check-urls'

describe('rewriteHost', () => {
  it('moves a live address onto the base and keeps the path as it is', () => {
    expect(rewriteHost('https://tiarracosmetics.com/store/reuzel', 'http://localhost:3100')).toBe(
      'http://localhost:3100/store/reuzel',
    )
  })

  it('gives the bare home address a slash', () => {
    expect(rewriteHost('https://tiarracosmetics.com', 'http://localhost:3100')).toBe('http://localhost:3100/')
  })

  it('keeps percent-encoding and the query', () => {
    expect(
      rewriteHost('https://tiarracosmetics.com/store/category/%D0%B3?x=1', 'https://preview.example/'),
    ).toBe('https://preview.example/store/category/%D0%B3?x=1')
  })
})

describe('expectationFor', () => {
  it('expects 301 and the new address for the template pages of the old shop', () => {
    expect(expectationFor('/blog')).toEqual({ status: 301, location: '/' })
    expect(expectationFor('/blog/blog-post-one')).toEqual({ status: 301, location: '/' })
    expect(expectationFor('/about-us')).toEqual({ status: 301, location: '/promo/za-nas' })
    expect(expectationFor('/contact-us')).toEqual({ status: 301, location: '/promo/kontakti' })
    expect(expectationFor('/special-deals')).toEqual({ status: 301, location: '/promo' })
    expect(expectationFor('/dsa')).toEqual({ status: 301, location: '/' })
    expect(expectationFor('/shipping-terms')).toEqual({ status: 301, location: '/dostavka-plashtane' })
    expect(expectationFor('/signin')).toEqual({ status: 301, location: '/' })
  })

  it('expects 200 for every real page', () => {
    for (const path of ['/', '/store', '/promo', '/promo/za-nas', '/promo/kontakti', '/store/reuzel', '/store/category/women']) {
      expect(expectationFor(path)).toEqual({ status: 200 })
    }
  })

  it('does not take a path that only starts like a template for one', () => {
    expect(expectationFor('/blogger')).toEqual({ status: 200 })
    expect(expectationFor('/dsa-info')).toEqual({ status: 200 })
    expect(expectationFor('/signin-help')).toEqual({ status: 200 })
  })
})

describe('navigationPaths', () => {
  it('lists the menu and footer links once each, internal ones only', () => {
    const paths = navigationPaths({
      menu: [
        { label: 'A', href: '/store' },
        { label: 'B', href: 'https://example.com/out' },
      ],
      footer: [{ title: 'F', links: [{ label: 'A again', href: '/store' }, { label: 'C', href: '/promo' }] }],
    })

    expect(paths).toEqual(['/store', '/promo'])
  })
})
