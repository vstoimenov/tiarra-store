import { describe, expect, it } from 'vitest'
import { splitProductDescription } from '@/lib/catalog/split-description'

describe('split product descriptions', () => {
  it('retains the selected aroma and later description while removing other aromas', () => {
    const html = '<p><strong>Аромат:</strong> MAGNETISME</p><p>Описание</p><p>Аромати:</p><p>•BLUE-BLEU</p><p>•MAGNETISME-THE SCENT</p><p>•DORIAN-IMAGINATION</p><p><br /></p><p>Произход: Франция</p>'
    const cleaned = splitProductDescription(html, 'YODEYMA — MAGNETISME')
    expect(cleaned).toContain('MAGNETISME-THE SCENT')
    expect(cleaned).not.toContain('BLUE-BLEU')
    expect(cleaned).not.toContain('DORIAN-IMAGINATION')
    expect(cleaned).toContain('Произход: Франция')
  })
  it('keeps the selected numbered aftershave aroma', () => {
    const html = '<p><strong>Аромат:</strong> 00 Northern Lights – свеж</p><p>Аромати:</p><p>00 Northern Lights – свеж.</p><p>01 Antarctica – цитрус.</p><p>02 Storm – ванилия.</p><p><br /></p><p>Употреба</p>'
    const cleaned = splitProductDescription(html, 'Nishman — 00 Northern Lights')
    expect(cleaned).toContain('00 Northern Lights – свеж.')
    expect(cleaned).not.toContain('01 Antarctica')
    expect(cleaned).toContain('Употреба')
  })
  it('does not modify grouped or unrecognized descriptions', () => {
    const html = '<p>Аромати:</p><p>Един</p><p>Два</p><p>Три</p>'
    expect(splitProductDescription(html, 'Продукт')).toBe(html)
    expect(splitProductDescription('<p><strong>Аромат:</strong> X</p>' + html, 'Продукт — X')).toBe('<p><strong>Аромат:</strong> X</p>' + html)
  })
})
