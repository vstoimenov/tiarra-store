'use client'

import Link from 'next/link'
import { useState } from 'react'
import { trackCommerce } from '@/lib/analytics'
import { addCartItem } from '@/lib/cart'
import type { Product } from '@/lib/catalog/types'
import { formatPrice } from '@/lib/format'
import { imageUrl } from '@/lib/images'
import styles from './ProductBump.module.css'

export function ProductBump({ product, label }: { product: Product; label: string }) {
  const [added, setAdded] = useState(false)
  const canQuickAdd = product.variants.length === 0 && product.inStock
  const imagePath = product.images[0]?.path ?? null

  function add() {
    if (!canQuickAdd) return
    addCartItem({
      key: `${product.id}:default`,
      productId: product.id,
      slug: product.slug,
      title: product.title,
      imagePath,
      variantId: null,
      variantName: null,
      unitPrice: product.price,
      quantity: 1,
    })
    trackCommerce('add_to_cart', { currency: 'EUR', value: product.price, items: [{ item_id: product.id, item_name: product.title, price: product.price, quantity: 1 }] })
    setAdded(true)
    window.setTimeout(() => setAdded(false), 2200)
  }

  return (
    <aside className={styles.bump} aria-labelledby="product-bump-title">
      <p className={styles.eyebrow}>{label}</p>
      <div className={styles.row}>
        <Link href={`/store/${product.slug}`} className={styles.product}>
          <span className={styles.media}>
            {imagePath ? <img src={imageUrl(imagePath, 400)} alt="" loading="lazy" /> : null}
          </span>
          <span className={styles.copy}>
            <strong id="product-bump-title">{product.title}</strong>
            <span>{formatPrice(product.price)}</span>
          </span>
        </Link>
        {canQuickAdd ? (
          <button type="button" className={styles.add} onClick={add} aria-label={`Добави ${product.title}`}>
            {added ? 'Добавено ✓' : '+ Добави'}
          </button>
        ) : (
          <Link href={`/store/${product.slug}`} className={styles.add}>Избери</Link>
        )}
      </div>
    </aside>
  )
}

