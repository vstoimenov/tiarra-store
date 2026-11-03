import Link from 'next/link'
import { ProductCard } from '@/components/product/ProductCard'
import type { ProductCard as Card } from '@/lib/catalog/types'
import type { SectionOf } from '@/lib/sections/schema'
import { ProductsCarousel } from './ProductsCarousel'
import styles from './ProductsSection.module.css'

interface Props {
  section: SectionOf<'products'>
  /** The cards of this section, already picked and cut to its limit (see cardsForSection). */
  cards: Card[]
  /**
   * `panel`: a white panel with the title and a sideways carousel (a section on its own).
   * `grid`: a plain two-column grid, used next to the offer.
   */
  layout?: 'panel' | 'grid'
}

const PANEL_SIZES = '(min-width: 900px) 340px, 78vw'
const GRID_SIZES = '(min-width: 900px) 330px, 46vw'

export function ProductsSection({ section, cards, layout = 'panel' }: Props) {
  if (cards.length === 0) return null

  const { title, subtitle, moreHref } = section.data
  const grid = layout === 'grid'
  const label = title || 'Продукти'

  return (
    <section className={grid ? styles.grid : styles.panel} data-section={section.id} aria-label={title ? undefined : label}>
      {(title || subtitle) && (
        <header className={styles.header}>
          {title && <h2 className={styles.title}>{title}</h2>}
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </header>
      )}
      {grid ? (
        <ul className={styles.cards}>
          {cards.map((card) => (
            <li key={card.slug}>
              <ProductCard card={card} sizes={GRID_SIZES} />
            </li>
          ))}
        </ul>
      ) : (
        <ProductsCarousel label={label}>
          {cards.map((card) => (
            <li key={card.slug}>
              <ProductCard card={card} sizes={PANEL_SIZES} />
            </li>
          ))}
        </ProductsCarousel>
      )}
      {moreHref && (
        <p className={styles.more}>
          <Link href={moreHref} className={styles.moreLink}>
            Виж всички продукти
          </Link>
        </p>
      )}
    </section>
  )
}
