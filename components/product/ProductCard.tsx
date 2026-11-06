import Link from 'next/link'
import type { ProductCard as Card } from '@/lib/catalog/types'
import { discountPercent, formatPrice, isDiscounted } from '@/lib/format'
import { imageSrcSet, imageUrl } from '@/lib/images'
import { Savings } from './Savings'
import styles from './ProductCard.module.css'

interface Props {
  card: Card
  /** Hint for the browser about the rendered width, so it picks the right file from the srcset. */
  sizes?: string
  /** The picture may be the page's LCP: fetched at once and first. Leave out below the fold, where it is lazy. */
  priority?: boolean
}

/**
 * How many cards of a listing are on the first screen of a phone (its first row). Their pictures are
 * the LCP candidates, so they are not lazy; a lazy picture is only requested after layout, which
 * on a slow connection is a second or more later.
 */
export const FIRST_ROW_CARDS = 2

const DEFAULT_SIZES = '(min-width: 900px) 340px, 80vw'

/**
 * One product in a grid or a carousel. The whole card is a single link to the product page;
 * the old price and `-N%` show only when the old price is above the price.
 */
export function ProductCard({ card, sizes = DEFAULT_SIZES, priority = false }: Props) {
  const oldPrice = isDiscounted(card.price, card.compareAtPrice) ? card.compareAtPrice : null

  return (
    <article className={styles.card} data-gender={card.gender}>
      <Link href={`/store/${card.slug}`} className={styles.link}>
        <div className={styles.media}>
          {oldPrice !== null && <span className={styles.badge}>-{discountPercent(oldPrice, card.price)}%</span>}
          {card.imagePath && (
            <img
              src={imageUrl(card.imagePath, 400)}
              srcSet={imageSrcSet(card.imagePath)}
              sizes={sizes}
              alt=""
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : undefined}
              decoding="async"
            />
          )}
        </div>
        <h3 className={styles.title}>{card.title}</h3>
        <p className={styles.price}>
          {card.hasVariants && <span className={styles.from}>От </span>}
          {formatPrice(card.price)}
          {oldPrice !== null && <s className={styles.old}>{formatPrice(oldPrice)}</s>}
        </p>
        <Savings price={card.price} compareAtPrice={oldPrice} />
        <span className={styles.cta}>Виж продукта</span>
      </Link>
    </article>
  )
}
