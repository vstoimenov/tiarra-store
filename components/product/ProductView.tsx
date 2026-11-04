'use client'

import { useState, type ReactNode } from 'react'
import { addCartItem } from '@/lib/cart'
import { initialVariantId, resolveVariantState } from '@/lib/catalog/variant'
import type { Product } from '@/lib/catalog/types'
import { BuyBox } from './BuyBox'
import { Gallery } from './Gallery'
import { ProductBump } from './ProductBump'
import styles from './ProductView.module.css'

interface Props {
  product: Product
  /** Above the title: the breadcrumbs (rendered on the server). */
  breadcrumbs: ReactNode
  bump?: { product: Product; label: string } | null
}

/**
 * The top of the page: gallery beside the panel with the title and the buy box. The selected
 * variant is shared between the two, because choosing a variant swaps the picture too.
 */
export function ProductView({ product, breadcrumbs, bump = null }: Props) {
  const [variantId, setVariantId] = useState(() => initialVariantId(product))
  const [added, setAdded] = useState(false)
  const state = resolveVariantState(product, variantId)

  function add(quantity: number) {
    const variant = product.variants.find((entry) => entry.id === variantId) ?? null
    addCartItem({
      key: `${product.id}:${variantId ?? 'default'}`,
      productId: product.id,
      slug: product.slug,
      title: product.title,
      imagePath: state.imagePath,
      variantId,
      variantName: variant?.name ?? null,
      unitPrice: state.price,
      quantity,
    })
    setAdded(true)
    window.setTimeout(() => setAdded(false), 2500)
  }

  return (
    <div className={styles.view}>
      <Gallery images={product.images} selectedPath={state.imagePath} title={product.title} />
      <div className={styles.panel}>
        {breadcrumbs}
        <h1 className={styles.title}>{product.title}</h1>
        <ul className={styles.promises} aria-label="Предимства">
          <li>100% оригинален</li><li>Доставка 1–2 дни</li><li>Преглед</li>
        </ul>
        <BuyBox
          product={product}
          variantId={variantId}
          onVariantChange={setVariantId}
          onAdd={({ quantity }) => add(quantity)}
        />
        {added && <p role="status" className={styles.added}>Продуктът е добавен в количката.</p>}
        {bump ? <ProductBump product={bump.product} label={bump.label} /> : null}
      </div>
    </div>
  )
}
