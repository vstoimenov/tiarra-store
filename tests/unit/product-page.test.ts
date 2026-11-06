import { describe, expect, it } from 'vitest'
import * as page from '@/app/store/[slug]/page'

describe('product page route', () => {
  // Existing products are prebuilt; reactivated products can render without redeploying.
  it('supports products reactivated after build', () => {
    expect(page.dynamicParams).toBe(true)
    expect(typeof page.generateStaticParams).toBe('function')
  })
})
