import type { ProductCard as Card } from '@/lib/catalog/types'
import { SectionHead } from '@/components/sections/SectionHead'
import { ProductCard } from './ProductCard'
import styles from './RelatedProducts.module.css'

const SIZES = '(min-width: 1000px) 280px, 46vw'

/** Other products of the same category (and gender), as the cards of the listings. Nothing when there are none. */
export function RelatedProducts({ cards }: { cards: Card[] }) {
  if (cards.length === 0) return null

  return (
    <section className={styles.related} data-testid="related" aria-label="Подобни продукти">
      <SectionHead title="Подобни продукти" highlight="продукти" size="md" />
      <ul className={styles.cards}>
        {cards.map((card) => (
          <li key={card.slug}>
            <ProductCard card={card} sizes={SIZES} />
          </li>
        ))}
      </ul>
    </section>
  )
}
