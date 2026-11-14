import sanitizeHtml from 'sanitize-html'

// Conservative extraction: only named notes immediately following an explicit “notes of” phrase.
// Catalog descriptions inherited from multi-variant products are excluded by the caller.
const noteWords = /(?:дървета|дървесина|рози|роза|жасмин|бергамот|мандарина|портокал|грейпфрут|лимон|круша|праскова|малина|ягода|касис|ванилия|карамел|кокос|какао|кафе|мед|бадем|лавандула|тубероза|нероли|ирис|виолетка|лилия|орхидея|божур|пачули|сандалово дърво|сандал|кедър|ветивер|тютюн|тамян|кожа|пипер|канела|кардамон|шафран|амбра|амбър|мускус)/giu

function descriptionText(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/gu, ' ')
}

/** Split products can inherit an entire list of aromas from the original product. */
export function isProductSpecificDescription(html: string, variant?: string): boolean {
  const text = descriptionText(html)
  if (/(?:аромати|разновидности|варианти|видове)\s*:/iu.test(text)) return false
  return !variant?.trim() || text.toLocaleLowerCase('bg').includes(variant.trim().toLocaleLowerCase('bg'))
}

export function extractDescriptionNotes(html: string): string[] {
  const text = descriptionText(html)
  const notes = new Set<string>()
  for (const match of text.matchAll(/(?=нотки\s+(?:на|от)\s+([^.!?;,:]{1,90}))/giu)) {
    const phrase = match[1]
    for (const candidate of phrase.matchAll(noteWords)) {
      const before = phrase[candidate.index - 1] ?? ''
      const after = phrase[candidate.index + candidate[0].length] ?? ''
      if ((before && /\p{L}/u.test(before)) || (after && /\p{L}/u.test(after))) continue
      notes.add(candidate[0].toLocaleLowerCase('bg'))
    }
  }
  return [...notes]
}
