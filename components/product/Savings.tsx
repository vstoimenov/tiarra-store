import { formatPrice, isDiscounted } from '@/lib/format'
import styles from './Savings.module.css'

/** Savings always belong to the displayed price/variant, per one item. */
export function Savings({ price, compareAtPrice }: { price: number; compareAtPrice: number | null }) {
  if (!Number.isFinite(price) || compareAtPrice === null || !Number.isFinite(compareAtPrice) || !isDiscounted(price, compareAtPrice)) return null
  const amount = Math.round((compareAtPrice - price) * 100) / 100
  if (amount <= 0) return null
  return <span className={styles.saving}>Спестяваш {formatPrice(amount)}</span>
}
