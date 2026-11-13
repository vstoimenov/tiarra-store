import type { Perfume } from '../../lib/catalog/types'

type Field = 'top' | 'heart' | 'base' | 'aroma' | 'volume'

interface Label {
  field: Field
  pattern: string
  /** Only counts at the very start of a segment (the live script anchors „Аромат:“ to the line start). */
  atStart?: boolean
}

// Same labels as tiarra-sections/07-product-perfume.html.
const LABELS: Label[] = [
  { field: 'top', pattern: '(?:Връхни|Върхни|Горни)\\s+нотки\\s*:' },
  { field: 'heart', pattern: '(?:Сърдечни|Средни)\\s+нотки\\s*:' },
  { field: 'base', pattern: '(?:Базови|Основни)\\s+нотки\\s*:' },
  { field: 'aroma', pattern: 'Аромат\\s*:', atStart: true },
  { field: 'volume', pattern: 'Обем\\s*:' },
]

const VOLUME = /([0-9]+(?:[.,][0-9]+)?\s*(?:ml|мл))/iu

const NAMED_ENTITIES: Record<string, string> = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

function decodeEntities(text: string): string {
  return text.replace(/&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi, (whole, dec, hex, name) => {
    if (name) return NAMED_ENTITIES[name.toLowerCase()] ?? whole
    const code = dec ? Number(dec) : parseInt(hex, 16)
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole
  })
}

/** Plain text with a newline at every paragraph, list item, heading or <br> boundary. */
function htmlToText(html: string): string {
  const withBreaks = html.replace(/<\s*br\s*\/?>/gi, '\n').replace(/<\/\s*(?:p|div|li|ul|ol|h[1-6]|tr)\s*>/gi, '\n')
  return decodeEntities(withBreaks.replace(/<[^>]*>/g, ''))
}

/** „розов пипер, круша — ярко начало…“ → „Розов пипер, круша“ */
function clean(raw: string): string {
  const head = raw.split(/\s[—–-]\s/u)[0].trim().replace(/[.;,]+$/u, '')
  return head.charAt(0).toUpperCase() + head.slice(1)
}

interface Hit {
  field: Field
  start: number
  end: number
}

function findLabels(segment: string): Hit[] {
  const hits: Hit[] = []
  for (const label of LABELS) {
    for (const m of segment.matchAll(new RegExp(label.pattern, 'giu'))) {
      if (label.atStart && m.index !== 0) continue
      hits.push({ field: label.field, start: m.index, end: m.index + m[0].length })
    }
  }
  return hits.sort((a, b) => a.start - b.start)
}

function readValue(field: Field, raw: string): string {
  if (field !== 'volume') return clean(raw)
  const m = raw.match(VOLUME)
  return m ? m[1].replace(/\s+/g, ' ') : ''
}

/**
 * Reads the fragrance pyramid from a product description. A value runs up to the next „•“,
 * the next label or the end of the paragraph. Needs at least two of top / heart / base.
 */
export function parsePerfumeNotes(html: string): Perfume | null {
  const perfume: Perfume = {}
  for (const piece of htmlToText(html).split(/[\n•]/u)) {
    const segment = piece.replace(/\s+/g, ' ').trim()
    const hits = findLabels(segment)
    hits.forEach((hit, i) => {
      if (perfume[hit.field]) return
      const value = readValue(hit.field, segment.slice(hit.end, hits[i + 1]?.start ?? segment.length))
      if (value) perfume[hit.field] = value
    })
  }
  const notes = [perfume.top, perfume.heart, perfume.base].filter(Boolean).length
  return notes >= 2 ? perfume : null
}
