import type { ProductCard } from '@/lib/catalog/types'
import { isDiscounted } from '@/lib/format'
import type { SectionOf } from './schema'

type ProductsData = SectionOf<'products'>['data']

const newestFirst = (a: ProductCard, b: ProductCard) =>
  b.createdAt.localeCompare(a.createdAt) || a.slug.localeCompare(b.slug)

const MIXED_GROUPS = ['women', 'men', 'parfimes', 'komplekt', 'other'] as const

function mixedCatalog(allCards: ProductCard[]): ProductCard[] {
  const buckets = new Map<string, ProductCard[]>(MIXED_GROUPS.map((group) => [group, []]))
  for (const card of [...allCards].sort(newestFirst)) {
    const group = MIXED_GROUPS.find((candidate) => candidate !== 'other' && card.categorySlugs.includes(candidate)) ?? 'other'
    buckets.get(group)!.push(card)
  }

  const result: ProductCard[] = []
  for (let index = 0; result.length < allCards.length; index++) {
    let added = false
    for (const group of MIXED_GROUPS) {
      const card = buckets.get(group)?.[index]
      if (card) {
        result.push(card)
        added = true
      }
    }
    if (!added) break
  }
  return result
}

/**
 * The cards a products section shows, from the one list of every card the page loaded
 * (so the page runs a single catalog query, however many sections it has). Every source is
 * newest first except `manual`, which keeps the editor's order. The result is cut to `limit`.
 */
export function cardsForSection(data: ProductsData, allCards: ProductCard[]): ProductCard[] {
  let cards: ProductCard[]
  switch (data.source) {
    case 'all':
    case 'newest':
      cards = allCards
      break
    case 'mixed':
      return mixedCatalog(allCards).slice(0, data.limit)
    case 'category':
      cards = allCards.filter((c) => c.categorySlugs.includes(data.categorySlug ?? ''))
      break
    case 'onSale':
      cards = allCards.filter((c) => isDiscounted(c.price, c.compareAtPrice))
      break
    case 'manual': {
      const bySlug = new Map(allCards.map((c) => [c.slug, c]))
      return (data.slugs ?? []).flatMap((slug) => bySlug.get(slug) ?? []).slice(0, data.limit)
    }
  }
  return [...cards].sort(newestFirst).slice(0, data.limit)
}
