'use client'

import { useState } from 'react'
import { ProductCard } from '@/components/product/ProductCard'
import type { ProductCard as Card } from '@/lib/catalog/types'
import { ProductsCarousel } from './ProductsCarousel'

const INITIAL_CARDS = 18
const LOAD_STEP = 18

/** Keeps the full mixed catalog available without placing hundreds of cards in the first HTML. */
export function ProgressiveProductsCarousel({ cards, label, sizes }: { cards: Card[]; label: string; sizes: string }) {
  const [visible, setVisible] = useState(Math.min(INITIAL_CARDS, cards.length))
  const hasMore = visible < cards.length

  return (
    <ProductsCarousel
      label={label}
      hasMore={hasMore}
      onLoadMore={() => setVisible((count) => Math.min(count + LOAD_STEP, cards.length))}
    >
      {cards.slice(0, visible).map((card) => (
        <li key={card.slug}>
          <ProductCard card={card} sizes={sizes} />
        </li>
      ))}
    </ProductsCarousel>
  )
}
