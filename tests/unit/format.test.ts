import { describe, expect, it } from 'vitest'
import { discountPercent, formatPrice, isDiscounted } from '@/lib/format'

describe('formatPrice', () => {
  it('uses a decimal comma and the euro sign after a space', () => {
    expect(formatPrice(29.9)).toBe('29,90 €')
    expect(formatPrice(48)).toBe('48,00 €')
  })

  it('rounds to two decimals', () => {
    expect(formatPrice(34.236)).toBe('34,24 €')
  })

  it('groups thousands with a narrow no-break space or none at all, never a comma', () => {
    expect(formatPrice(1234.5)).toMatch(/^1\D?234,50 €$/)
  })

  it('uses a plain space before the euro sign', () => {
    expect(formatPrice(5)).toBe('5,00 €')
    expect(formatPrice(5).charCodeAt(4)).toBe(0x20)
  })
})

describe('discountPercent', () => {
  it('rounds the saving to a whole percent', () => {
    expect(discountPercent(34.9, 29.9)).toBe(14)
    expect(discountPercent(59.9, 48)).toBe(20)
  })
})

describe('isDiscounted', () => {
  it('is true only when the old price is above the price', () => {
    expect(isDiscounted(29.9, 34.9)).toBe(true)
    expect(isDiscounted(29.9, 29.9)).toBe(false)
    expect(isDiscounted(29.9, 20)).toBe(false)
    expect(isDiscounted(29.9, null)).toBe(false)
  })
})
