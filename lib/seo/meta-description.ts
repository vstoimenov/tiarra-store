import { htmlToText } from '@/lib/sections/faq-jsonld'

const MAX = 155

/**
 * A search-result description made from a description's html: the text, cut at a word so the
 * whole thing, ellipsis included, is at most 155 characters. Empty when there is no text.
 */
export function metaDescription(html: string, max = MAX): string {
  const text = htmlToText(html)
  if (text.length <= max) return text

  const room = text.slice(0, max - 1)
  const atWord = room.replace(/\s+\S*$/, '')
  // A single very long word has no space to cut at; cut it where the room ends.
  return `${(atWord || room).replace(/[\s,.;:!?-]+$/, '')}…`
}
