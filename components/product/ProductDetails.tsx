import type { ReactNode } from 'react'
import type { Product } from '@/lib/catalog/types'
import styles from './ProductDetails.module.css'

const genderLabel = { female: 'Дамски', male: 'Мъжки', unisex: 'Унисекс' } as const

export function ProductDetails({
  product,
  description,
  perfume,
  delivery,
}: {
  product: Product
  description?: ReactNode
  perfume?: ReactNode
  delivery: ReactNode
}) {
  const facts = [
    product.brand ? ['Марка', product.brand] : null,
    ['Подходящ за', genderLabel[product.gender]],
    product.categories.length ? ['Категория', product.categories.map((category) => category.name).join(', ')] : null,
    product.perfume?.aroma ? ['Аромат', product.perfume.aroma] : null,
    product.perfume?.volume ? ['Количество', product.perfume.volume] : null,
    ['Наличност', product.inStock ? 'В наличност' : 'Изчерпан'],
  ].filter((fact): fact is string[] => fact !== null)

  return (
    <section className={styles.section} aria-label="Информация за продукта">
      <p className={styles.kicker}>Всичко важно, без излишно търсене</p>
      <h2 className={styles.heading}>Детайли за продукта</h2>

      {description ? (
        <details className={styles.item} open>
          <summary><span>Описание</span><span className={styles.plus} aria-hidden="true" /></summary>
          <div className={styles.content}>{description}</div>
        </details>
      ) : null}

      <details className={styles.item}>
        <summary><span>Основни данни</span><span className={styles.plus} aria-hidden="true" /></summary>
        <div className={styles.content}>
          <dl className={styles.facts}>
            {facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl>
        </div>
      </details>

      {perfume ? (
        <div className={styles.fragrance}>{perfume}</div>
      ) : null}

      <section className={styles.item} aria-labelledby="delivery-heading">
        <h3 id="delivery-heading" className={styles.deliveryHeading}>Доставка, плащане и връщане</h3>
        <div className={`${styles.content} ${styles.delivery}`}>{delivery}</div>
      </section>
    </section>
  )
}
