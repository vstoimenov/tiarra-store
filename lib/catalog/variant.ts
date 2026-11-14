import { discountPercent, isDiscounted } from '@/lib/format'
import { isAvailable } from './stock'
import type { Product, Variant } from './types'

/** What the buy box shows for one selection. */
export interface VariantState {
  price: number
  /** The old price; `null` unless it is above the price (ruling R7). */
  compareAtPrice: number | null
  /** The saving in whole percent; `null` exactly when there is no old price. */
  discountPercent: number | null
  /** Whether this selection can be bought. A variant with stock 0 is out; the product need not be. */
  inStock: boolean
  /** Units left; `null` when not tracked. */
  stock: number | null
  /** The picture of the variant, or of the product without variants; `null` when there is none. */
  imagePath: string | null
}

const byPosition = (a: Variant, b: Variant) => a.position - b.position

/**
 * The variant selected when the page opens: the first by position that can be bought. When
 * every variant is out the first one is still selected, so the page shows it as „Изчерпан“.
 * `null` for a product without variants.
 */
export function initialVariantId(p: Product): string | null {
  const variants = [...p.variants].sort(byPosition)
  return (variants.find((v) => isAvailable(v.stock)) ?? variants[0])?.id ?? null
}

/** Price, old price, availability and picture for the selected variant; the product's own fields when there is none. */
export function resolveVariantState(p: Product, variantId: string | null): VariantState {
  const variant = variantId === null ? undefined : p.variants.find((v) => v.id === variantId)
  const source = variant ?? {
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    stock: p.stock,
    imagePath: p.imagePath,
  }
  // A product with variants but no valid selection falls back to the card's figures, which already count its variants.
  const inStock = variant ? isAvailable(variant.stock) : p.inStock
  const oldPrice = isDiscounted(source.price, source.compareAtPrice) ? source.compareAtPrice : null

  return {
    price: source.price,
    compareAtPrice: oldPrice,
    discountPercent: oldPrice === null ? null : discountPercent(oldPrice, source.price),
    inStock,
    stock: source.stock,
    imagePath: source.imagePath ?? p.imagePath,
  }
}
