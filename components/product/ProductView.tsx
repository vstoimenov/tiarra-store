'use client'

import { useState, type ReactNode } from 'react'
import { initialVariantId, resolveVariantState } from '@/lib/catalog/variant'
import type { Product } from '@/lib/catalog/types'
import { BuyBox } from './BuyBox'
import { Gallery } from './Gallery'
import styles from './ProductView.module.css'

interface Props {
  product: Product
  /** Above the title: the breadcrumbs (rendered on the server). */
  breadcrumbs: ReactNode
  /** Under the buy box: the product's description (rendered on the server). */
  description: ReactNode
}

/**
 * The top of the page: gallery beside the panel with the title and the buy box. The selected
 * variant is shared between the two, because choosing a variant swaps the picture too.
 */
export function ProductView({ product, breadcrumbs, description }: Props) {
  const [variantId, setVariantId] = useState(() => initialVariantId(product))
  const { imagePath } = resolveVariantState(product, variantId)

  return (
    <div className={styles.view}>
      <Gallery images={product.images} selectedPath={imagePath} title={product.title} />
      <div className={styles.panel}>
        {breadcrumbs}
        <h1 className={styles.title}>{product.title}</h1>
        <BuyBox product={product} variantId={variantId} onVariantChange={setVariantId} />
        {description}
      </div>
    </div>
  )
}
