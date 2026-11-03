import { describe, expect, it } from 'vitest'
import { isAvailable } from '@/lib/catalog/stock'

describe('isAvailable', () => {
  it('treats untracked stock (null) as available', () => {
    expect(isAvailable(null)).toBe(true)
  })

  it('is available when stock is above zero', () => {
    expect(isAvailable(1)).toBe(true)
    expect(isAvailable(250)).toBe(true)
  })

  it('is unavailable at zero or below', () => {
    expect(isAvailable(0)).toBe(false)
    expect(isAvailable(-3)).toBe(false)
  })
})
