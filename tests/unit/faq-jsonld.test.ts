import { describe, expect, it } from 'vitest'
import { faqJsonLd, htmlToText } from '@/lib/sections/faq-jsonld'

describe('htmlToText', () => {
  it('drops tags and decodes the entities our seed uses', () => {
    expect(htmlToText('<p>Да, <b>100% оригинални</b>.&nbsp;Без &amp; реплики.</p>')).toBe('Да, 100% оригинални. Без & реплики.')
  })

  it('keeps the words of paragraphs apart', () => {
    expect(htmlToText('<p>Първо.</p><p>Второ.</p>')).toBe('Първо. Второ.')
  })

  it('keeps link text but not the address', () => {
    expect(htmlToText('Пиши на <a href="mailto:info@tiarracosmetics.com">info@tiarracosmetics.com</a>.')).toBe(
      'Пиши на info@tiarracosmetics.com.',
    )
  })
})

describe('faqJsonLd', () => {
  const ld = faqJsonLd([
    { q: 'Оригинални ли са продуктите?', aHtml: '<p>Да, <b>100% оригинални</b>.</p>' },
    { q: 'Колко струва доставката?', aHtml: '<p>Над <b>39 €</b> е безплатна.</p>' },
  ])

  it('is a schema.org FAQPage', () => {
    expect(ld['@context']).toBe('https://schema.org')
    expect(ld['@type']).toBe('FAQPage')
  })

  it('lists every question with its plain-text answer', () => {
    expect(ld.mainEntity).toEqual([
      {
        '@type': 'Question',
        name: 'Оригинални ли са продуктите?',
        acceptedAnswer: { '@type': 'Answer', text: 'Да, 100% оригинални.' },
      },
      {
        '@type': 'Question',
        name: 'Колко струва доставката?',
        acceptedAnswer: { '@type': 'Answer', text: 'Над 39 € е безплатна.' },
      },
    ])
  })
})
