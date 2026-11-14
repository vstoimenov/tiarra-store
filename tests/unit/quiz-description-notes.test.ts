import { describe, expect, it } from 'vitest'
import { extractDescriptionNotes, isProductSpecificDescription } from '@/lib/catalog/description-fragrance'

describe('fragrance notes from descriptions', () => {
  it('extracts explicitly named notes from real prose without inventing pyramid positions', () => {
    const html = '<p>Ориенталски нотки на ценни дървета и елегантни нотки на рози, скрити в техните оазиси.</p>'
    expect(extractDescriptionNotes(html)).toEqual(['дървета', 'рози'])
  })
  it('does not classify general claims or unrelated text as notes', () => {
    expect(extractDescriptionNotes('<p>Омагьосва сетивата със своите завладяващи нотки.</p><p>Създаден с любов към розата.</p>')).toEqual([])
  })
  it('rejects inherited multi-aroma lists while allowing specifically named variant descriptions', () => {
    expect(isProductSpecificDescription('<p>Аромати: ONE, TWO</p><p>Нотки на роза.</p>', 'ONE')).toBe(false)
    expect(isProductSpecificDescription('<p>Описание на OTHER с нотки на роза.</p>', 'OTHER')).toBe(true)
    expect(isProductSpecificDescription('<p>Общо описание с нотки на роза.</p>', 'OTHER')).toBe(false)
  })
})
