import sanitizeHtml from 'sanitize-html'
import { HomeDocSchema } from '@/lib/sections/schema'

export function parseHomeDocument(input: unknown) {
  const doc = HomeDocSchema.parse(input)
  if (doc.sections.length > 100) throw new Error('Максимум 100 секции.')
  if (new Set(doc.sections.map(s => s.id)).size !== doc.sections.length) throw new Error('Секциите трябва да имат различни идентификатори.')
  function clean(value: unknown, key = ''): unknown {
    if (typeof value === 'string') {
      if (/href$/i.test(key) && value && (/[\u0000-\u0020\\]/.test(value) || !/^(\/(?!\/)|https?:\/\/|mailto:|tel:|#)/i.test(value))) throw new Error('Използвай относителен адрес или https линк без интервали.')
      return /html$/i.test(key) ? sanitizeHtml(value) : value
    }
    if (Array.isArray(value)) return value.map(v => clean(v, key))
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v]) => [k,clean(v,k)]))
    return value
  }
  for (const s of doc.sections) if (s.showFrom && s.showUntil && Date.parse(s.showFrom) >= Date.parse(s.showUntil)) throw new Error('Краят трябва да е след началото.')
  return HomeDocSchema.parse(clean(doc))
}
