import { describe, expect, it } from 'vitest'
import * as legal from '@/app/[page]/page'
import * as home from '@/app/page'
import { LEGAL_PAGE_SLUGS } from '@/lib/site/pages'

describe('legal pages route', () => {
  // Only the five legal pages live at the top level. `za-nas` and `kontakti` are in the same
  // table but have their own addresses under /promo, so they must not be built here too.
  it('builds exactly the five legal pages and 404s everything else', async () => {
    expect(legal.dynamicParams).toBe(false)
    expect(await legal.generateStaticParams()).toEqual([
      { page: 'obshti-usloviya' },
      { page: 'dostavka-plashtane' },
      { page: 'vrashtane-zamyana' },
      { page: 'poveritelnost' },
      { page: 'biskvitki' },
    ])
    expect(LEGAL_PAGE_SLUGS).toHaveLength(5)
  })
})

describe('home page metadata', () => {
  it('has a title, a description and a canonical address of its own', () => {
    expect(home.metadata).toMatchObject({
      title: expect.stringContaining('Tiarra Cosmetics'),
      description: expect.any(String),
      alternates: { canonical: expect.stringMatching(/^https?:\/\/[^/]+$/) },
    })
  })
})
