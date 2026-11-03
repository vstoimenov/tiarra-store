import { isDiscounted } from '@/lib/format'
import type { ProductCard } from './types'

export type SortKey = 'newest' | 'price-asc' | 'price-desc' | 'discount'

export interface ListingQuery {
  /** Words to look for in the title or the brand. */
  text?: string
  /** Exactly this brand. */
  brand?: string
  /** Newest first when left out. */
  sort?: SortKey
}

// `bg` keeps Cyrillic (and Latin) case folding right whatever the browser's own language is.
const fold = (s: string) => s.toLocaleLowerCase('bg')

/** The saving as a share of the old price, or -1 when the card has no real discount. */
function savedShare(card: ProductCard): number {
  return isDiscounted(card.price, card.compareAtPrice) ? (card.compareAtPrice - card.price) / card.compareAtPrice : -1
}

const newestFirst = (a: ProductCard, b: ProductCard) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0)

// Every order falls back to newest-first, so cards that tie always come out the same way.
const orders: Record<SortKey, (a: ProductCard, b: ProductCard) => number> = {
  newest: newestFirst,
  'price-asc': (a, b) => a.price - b.price || newestFirst(a, b),
  'price-desc': (a, b) => b.price - a.price || newestFirst(a, b),
  discount: (a, b) => savedShare(b) - savedShare(a) || newestFirst(a, b),
}

/**
 * The cards matching the query, in the order asked for. Every word of `text` has to be found in the
 * title or the brand (case-insensitive); the input array is left as it is.
 */
export function filterProducts(cards: ProductCard[], q: ListingQuery): ProductCard[] {
  const words = fold(q.text ?? '').split(/\s+/).filter(Boolean)

  const matching = cards.filter((card) => {
    if (q.brand && card.brand !== q.brand) return false
    if (words.length === 0) return true
    const haystack = fold(`${card.title} ${card.brand ?? ''}`)
    return words.every((word) => haystack.includes(word))
  })

  return matching.sort(orders[q.sort ?? 'newest'])
}

/** The distinct brands of the cards, sorted, for the brand filter. */
export function brandsOf(cards: ProductCard[]): string[] {
  const brands = new Set<string>()
  for (const card of cards) if (card.brand) brands.add(card.brand)
  return [...brands].sort((a, b) => a.localeCompare(b, 'bg'))
}
