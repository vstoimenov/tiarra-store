import { describe, expect, it } from 'vitest'
import { decodeProductSlug } from '@/lib/catalog/slug'

describe('product route slugs', () => {
  it('finds newly added Cyrillic products by their encoded URL', () => {
    expect(decodeProductSlug('olfazeta-%D0%BA%D0%B5%D0%B9%D1%81-1eda9ed9')).toBe('olfazeta-кейс-1eda9ed9')
  })
  it('keeps normal and malformed values safe', () => {
    expect(decodeProductSlug('olfazeta-кейс-1eda9ed9')).toBe('olfazeta-кейс-1eda9ed9')
    expect(decodeProductSlug('bad%XX')).toBe('bad%XX')
  })
})
