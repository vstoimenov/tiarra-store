'use client'

import { useState } from 'react'
import type { Product } from '@/lib/catalog/types'
import { resolveVariantState } from '@/lib/catalog/variant'
import { formatPrice } from '@/lib/format'
import styles from './BuyBox.module.css'

export interface AddToCart {
  productId: string
  variantId: string | null
  quantity: number
}

interface Props {
  product: Product
  /** The selected variant; `null` for a product without variants. */
  variantId: string | null
  onVariantChange: (variantId: string) => void
  /** Called with what to add. Stage 1 has no cart, so the default does nothing; stage 2 wires it. */
  onAdd?: (item: AddToCart) => void
}

const UNTRACKED_MAX = 99
const noop = () => {}

/** `АРОМАТ` → `Аромат`: the option name is stored in capitals, and reads better as a label. */
function optionLabel(name: string): string {
  const lower = name.toLocaleLowerCase('bg')
  return lower.charAt(0).toLocaleUpperCase('bg') + lower.slice(1)
}

const maxFor = (stock: number | null) => (stock === null ? UNTRACKED_MAX : Math.max(stock, 0))

/**
 * Price, the choice of variant, the quantity and the add button. The variant is the page's state
 * (the picture follows it), so it comes in as props. A variant with stock 0 reads „Изчерпан“ and
 * disables the button; the other variants stay as they were.
 */
export function BuyBox({ product, variantId, onVariantChange, onAdd = noop }: Props) {
  const state = resolveVariantState(product, variantId)
  const max = maxFor(state.stock)
  const [text, setText] = useState('1')

  // Typing is free; the number that counts is the typed one held between 1 and the stock.
  const quantity = Math.min(Math.max(Number.parseInt(text, 10) || 1, 1), Math.max(max, 1))
  const variants = [...product.variants].sort((a, b) => a.position - b.position)

  function select(id: string) {
    const next = product.variants.find((v) => v.id === id)
    // A smaller stock pulls the quantity down with it.
    setText(String(Math.min(quantity, Math.max(maxFor(next?.stock ?? null), 1))))
    onVariantChange(id)
  }

  return (
    <div className={styles.box} data-testid="buybox">
      <p className={styles.prices} aria-live="polite">
        <span className={styles.price} data-testid="price">
          {formatPrice(state.price)}
        </span>
        {state.compareAtPrice !== null && (
          <>
            <s className={styles.old} data-testid="old-price">
              {formatPrice(state.compareAtPrice)}
            </s>
            <span className={styles.discount} data-testid="discount">
              -{state.discountPercent}%
            </span>
          </>
        )}
      </p>

      {variants.length > 0 && (
        <fieldset className={styles.options} role="radiogroup">
          <legend className={styles.legend}>{product.optionName ? `${optionLabel(product.optionName)}:` : 'Избор:'}</legend>
          <div className={styles.choices}>
            {variants.map((variant) => {
              const out = variant.stock !== null && variant.stock <= 0
              return (
                <label key={variant.id} className={`${styles.choice} ${out ? styles.out : ''}`}>
                  <input
                    type="radio"
                    name="variant"
                    className={styles.radio}
                    checked={variant.id === variantId}
                    onChange={() => select(variant.id)}
                  />
                  <span className={styles.chip}>
                    {variant.name}
                    {out && <span className="visually-hidden"> (изчерпан)</span>}
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>
      )}

      <div className={styles.buy}>
        <div className={styles.qty}>
          <button
            type="button"
            className={styles.step}
            aria-label="Намали количеството"
            disabled={!state.inStock || quantity <= 1}
            onClick={() => setText(String(quantity - 1))}
          >
            −
          </button>
          <input
            type="number"
            className={styles.qtyInput}
            aria-label="Количество"
            min={1}
            max={Math.max(max, 1)}
            inputMode="numeric"
            value={text}
            disabled={!state.inStock}
            onChange={(event) => setText(event.target.value)}
            onBlur={() => setText(String(quantity))}
          />
          <button
            type="button"
            className={styles.step}
            aria-label="Увеличи количеството"
            disabled={!state.inStock || quantity >= max}
            onClick={() => setText(String(quantity + 1))}
          >
            +
          </button>
        </div>

        <button
          type="button"
          className={styles.add}
          disabled={!state.inStock}
          onClick={() => onAdd({ productId: product.id, variantId, quantity })}
        >
          {state.inStock ? 'Добави в количката' : 'Изчерпан'}
        </button>
      </div>
    </div>
  )
}
