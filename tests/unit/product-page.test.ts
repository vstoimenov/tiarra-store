import { describe, expect, it } from 'vitest'
import * as page from '@/app/store/[slug]/page'

describe('product page route', () => {
  // A slug that is not a product must be a 404 at once, with no database lookup for it.
  it('builds only the products that exist', () => {
    expect(page.dynamicParams).toBe(false)
    expect(typeof page.generateStaticParams).toBe('function')
  })
})
