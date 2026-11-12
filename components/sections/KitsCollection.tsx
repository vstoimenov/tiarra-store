import Link from 'next/link'
import type { ProductCard } from '@/lib/catalog/types'
import type { SectionOf } from '@/lib/sections/schema'
import { discountPercent, formatPrice, isDiscounted } from '@/lib/format'
import { imageSrcSet, imageUrl } from '@/lib/images'
import { ProductsCarousel } from './ProductsCarousel'
import styles from './KitsCollection.module.css'

export function KitsCollection({ section, cards }: { section: SectionOf<'products'>; cards: ProductCard[] }) {
  if (!cards.length) return null
  const title = section.data.title.trim() || 'Комплекти за всеки'
  const subtitle = section.data.subtitle.trim() || 'Подбрани комбинации за грижа за косата, брадата и тялото.'
  return <section className={styles.section} data-section={section.id} aria-labelledby="kits-heading">
    <div className={styles.inner}>
      <header className={styles.heading}>
        <div><p className={styles.eyebrow}>ПОДБРАНО ЗА ТЕБ</p><h2 id="kits-heading">{title}</h2><p className={styles.subtitle}>{subtitle}</p></div>
        <Link className={styles.all} href={section.data.moreHref || '/store/category/komplekt'}>Всички комплекти <span aria-hidden="true">↗</span></Link>
      </header>
      <ProductsCarousel label={title}>
        {cards.map(card => {
          const discounted = isDiscounted(card.price, card.compareAtPrice)
          return <li key={card.slug}><Link className={styles.card} href={`/store/${encodeURIComponent(card.slug)}`}>
            <div className={styles.image}>
              {discounted && <span className={styles.badge}>−{discountPercent(card.compareAtPrice!, card.price)}%</span>}
              {card.imagePath && <img src={imageUrl(card.imagePath, 400)} srcSet={imageSrcSet(card.imagePath)} sizes="(min-width: 900px) 340px, 78vw" alt="" loading="lazy" decoding="async"/>}
            </div>
            <div className={styles.info}><span className={styles.brand}>{card.brand || 'TIARRA'}</span><h3>{card.title}</h3><div className={styles.price}>{card.hasVariants && <small>от </small>}{formatPrice(card.price)}{discounted && <s>{formatPrice(card.compareAtPrice!)}</s>}</div><span className={styles.discover}>Виж комплекта <span aria-hidden="true">↗</span></span></div>
          </Link></li>
        })}
      </ProductsCarousel>
    </div>
  </section>
}
