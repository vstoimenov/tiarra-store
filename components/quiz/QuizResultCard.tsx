'use client'

import { useState } from 'react'
import Link from 'next/link'
import { addCartItem } from '@/lib/cart'
import { trackCommerce } from '@/lib/analytics'
import { formatPrice, isDiscounted } from '@/lib/format'
import { imageSrcSet, imageUrl } from '@/lib/images'
import type { QuizProduct } from '@/lib/quiz/perfume'
import styles from './QuizResultCard.module.css'

export function QuizResultCard({ product, leading, matchedLabels }: { product: QuizProduct; leading: boolean; matchedLabels: string[] }) {
  const [status, setStatus] = useState('')
  const notes = [ ['Връх', product.perfume?.top], ['Сърце', product.perfume?.heart], ['База', product.perfume?.base] ] as const
  const hasNotes = notes.some(([, value]) => Boolean(value?.trim()))
  const productUrl = `/store/${product.slug}`
  function add() {
    try {
      addCartItem({ key: `${product.id}:default`, productId: product.id, slug: product.slug, title: product.title, imagePath: product.imagePath, variantId: null, variantName: null, unitPrice: product.price, quantity: 1 })
      trackCommerce('add_to_cart', { currency: 'EUR', value: product.price, items: [{ item_id: product.id, item_name: product.title, price: product.price, quantity: 1 }] })
      setStatus('Добавено в количката')
    } catch { setStatus('Не успяхме да добавим продукта. Опитай от страницата му.') }
  }
  return <article className={`${styles.card} ${leading ? styles.leading : ''}`}>
    <Link className={styles.image} href={productUrl} aria-label={`Виж ${product.title}`}>
      {product.imagePath && <img src={imageUrl(product.imagePath, 400)} srcSet={imageSrcSet(product.imagePath)} sizes="(max-width: 600px) 38vw, 210px" alt="" loading="lazy" decoding="async" />}
    </Link>
    <div className={styles.content}>
      <span className={styles.badge}>{leading ? 'НАЙ-БЛИЗЪК ИЗБОР' : 'ПРЕДЛОЖЕНИЕ ЗА ТЕБ'}</span>
      <h2><Link href={productUrl}>{product.title}</Link></h2>
      {product.brand && <p className={styles.brand}>{product.brand}</p>}
      {matchedLabels.length > 0 && <div className={styles.tags}>{matchedLabels.map(label => <span key={label}>{label}</span>)}</div>}
      {hasNotes ? <dl className={styles.notes}>{notes.map(([label, value]) => value?.trim() ? <div key={label}><dt>{label}:</dt><dd>{value}</dd></div> : null)}</dl> : <p className={styles.noNotes}>Няма въведени ароматни нотки.</p>}
      <div className={styles.actions}><p className={styles.price}>{product.hasVariants && <small>От </small>}{formatPrice(product.price)} {isDiscounted(product.price, product.compareAtPrice) && <s>{formatPrice(product.compareAtPrice)}</s>}</p>{product.hasVariants ? <Link className={styles.buy} href={productUrl}>Избери вариант</Link> : <button type="button" className={styles.buy} onClick={add}>Добави в количката</button>}<Link className={styles.more} href={productUrl}>Виж аромата</Link></div>
      {status && <p role="status" className={styles.status}>{status}</p>}
    </div>
  </article>
}
