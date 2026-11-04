'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { ProductCard } from '@/lib/catalog/types'
import { imageUrl } from '@/lib/images'
import { formatPrice } from '@/lib/format'
import styles from './Discover.module.css'

const selections = [
  { slug: 'women', name: 'За нея', text: 'Грижа, която остава с теб.', label: 'ТВОЕТО ВРЕМЕ' },
  { slug: 'men', name: 'За него', text: 'Характер във всеки детайл.', label: 'ТВОЯТ ПОЧЕРК' },
  { slug: 'parfimes', name: 'Аромати', text: 'Присъствие, което се помни.', label: 'ТВОЕТО УСЕЩАНЕ' },
  { slug: 'komplekt', name: 'Комплекти', text: 'Малки ритуали. Цялостна грижа.', label: 'ТВОЯТ РИТУАЛ' },
]

export function Discover({ cards, id }: { cards: ProductCard[]; id: string }) {
  const [active, setActive] = useState('women')
  const selection = selections.find(item => item.slug === active)!
  const products = cards.filter(card => card.inStock && card.imagePath && card.categorySlugs.includes(active)).slice(0, 3)
  return <section className={styles.root} data-section={id} aria-labelledby={`${id}-title`}>
    <div className={styles.layout}>
      <div className={styles.intro}><p className={styles.kicker}>ЛИЧНИЯТ ТИ ИЗБОР</p><h2 id={`${id}-title`}>Твоята грижа.<br /><em>Твоите правила.</em></h2><p className={styles.description}>Избери своя свят. Открий продуктите, с които ежедневието се превръща в ритуал.</p>
        <div className={styles.filters} aria-label="Избери категория">{selections.map((item,index) => <button type="button" key={item.slug} aria-pressed={active === item.slug} onClick={() => setActive(item.slug)}><span>0{index+1}</span>{item.name}<span aria-hidden="true">↗</span></button>)}</div>
      </div>
      <div className={styles.selection}><div className={styles.selectionHead}><div><span>{selection.label}</span><h3>{selection.text}</h3></div><Link href={`/store/category/${active}`}>Виж всички ↗</Link></div>
        <div className={styles.products} aria-live="polite">{products.map((product,index) => <Link key={product.slug} href={`/store/${product.slug}`} className={styles.product}><div className={styles.media}><span className={styles.index}>0{index+1}</span><img src={imageUrl(product.imagePath!,800)} width={400} height={480} alt={product.title} loading="lazy" decoding="async" /><span className={styles.explore} aria-hidden="true">Открий ↗</span></div><p>{product.brand || 'TIARRA SELECTION'}</p><h4>{product.title}</h4><strong>{product.hasVariants ? 'От ' : ''}{formatPrice(product.price)}</strong></Link>)}{!products.length && <p>Разгледай пълната селекция в категорията.</p>}</div>
      </div>
    </div>
    <div className={styles.bottom}><span>Подбрано с опит. Избрано от теб.</span><Link href="/promo/za-nas">Историята на Tiarra ↗</Link></div>
  </section>
}
