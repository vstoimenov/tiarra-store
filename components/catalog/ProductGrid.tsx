'use client'

import { Suspense, useCallback, useMemo, useState, type ChangeEvent, type ReactNode } from 'react'
import { FIRST_ROW_CARDS, ProductCard } from '@/components/product/ProductCard'
import { brandsOf, filterProducts, type SortKey } from '@/lib/catalog/filter'
import type { ProductCard as Card } from '@/lib/catalog/types'
import styles from './ProductGrid.module.css'
import { UrlQuery } from './UrlQuery'
import { SearchIcon } from '@/components/layout/icons'

interface Props {
  /** The page's `<h1>`. */
  title: string
  /** Every card of the page; the search, the filters and the sorting run here, in the browser. */
  cards: Card[]
  /** Filter by the `?q=` of the address (the header search sends people to `/store?q=…`). */
  readQuery?: boolean
  /** Shown between the heading and the grid (the category links). */
  children?: ReactNode
}

const PAGE_SIZE = 24
const SIZES = '(min-width: 900px) 374px, 46vw'

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Най-нови' },
  { value: 'price-asc', label: 'Цена ↑' },
  { value: 'price-desc', label: 'Цена ↓' },
  { value: 'discount', label: 'Най-голяма отстъпка' },
]

const isSortKey = (value: string): value is SortKey => SORTS.some((s) => s.value === value)

function countText(shown: number, total: number): string {
  if (total === 0) return 'Няма резултати'
  if (total === 1) return 'Показва се 1 резултат'
  return `Показват се 1 – ${shown} от ${total} резултата`
}

/**
 * A page of products: heading, brand filter, sort, the cards 24 at a time and „Покажи още“.
 * Rendered on the server like the rest of the page, so the first 24 cards are in the HTML.
 */
export function ProductGrid({ title, cards, readQuery = false, children }: Props) {
  const [text, setText] = useState('')
  const [brand, setBrand] = useState('')
  const [sort, setSort] = useState<SortKey>('newest')
  const [visible, setVisible] = useState(PAGE_SIZE)

  const brands = useMemo(() => brandsOf(cards), [cards])
  const matching = useMemo(() => filterProducts(cards, { text, brand, sort }), [cards, text, brand, sort])
  const shown = matching.slice(0, visible)
  const filtered = text !== '' || brand !== ''

  // A new search or filter starts again from the first 24.
  const onUrlQuery = useCallback((q: string) => {
    setText(q)
    setVisible(PAGE_SIZE)
  }, [])

  function onBrand(event: ChangeEvent<HTMLSelectElement>) {
    setBrand(event.target.value)
    setVisible(PAGE_SIZE)
  }

  function onSort(event: ChangeEvent<HTMLSelectElement>) {
    if (isSortKey(event.target.value)) setSort(event.target.value)
    setVisible(PAGE_SIZE)
  }

  function clearFilters() {
    // The search lives in the address: drop it there too, or a reload would bring it back.
    if (text !== '') window.history.replaceState(null, '', window.location.pathname)
    setText('')
    setBrand('')
    setSort('newest')
    setVisible(PAGE_SIZE)
  }

  return (
    <div className={styles.wrap}>
      {readQuery && (
        <Suspense fallback={null}>
          <UrlQuery onChange={onUrlQuery} />
        </Suspense>
      )}

      <header className={styles.head}>
        <div className={styles.intro}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.count} data-testid="result-count" aria-live="polite">
            {countText(shown.length, matching.length)}
          </p>
          {text !== '' && <p className={styles.term}>Търсене: „{text}“</p>}
        </div>

        <div className={styles.controls}>
          <label className={`${styles.field} ${styles.searchField}`}>
            <span className="visually-hidden">Търсене в категорията</span>
            <input
              type="search"
              className={styles.searchInput}
              value={text}
              onChange={(event) => {
                setText(event.target.value)
                setVisible(PAGE_SIZE)
              }}
              placeholder="Търси продукт..."
              autoComplete="off"
            />
            <SearchIcon className={styles.searchIcon} />
          </label>
          {brands.length > 1 && (
            <label className={styles.field}>
              Марка
              <select className={styles.select} value={brand} onChange={onBrand}>
                <option value="">Всички марки</option>
                {brands.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className={styles.field}>
            Сортиране по
            <select className={styles.select} value={sort} onChange={onSort}>
              {SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {children}

      {matching.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyText}>Няма намерени продукти</p>
          {filtered && (
            <button type="button" className={styles.button} onClick={clearFilters}>
              Изчисти филтрите
            </button>
          )}
        </div>
      ) : (
        <>
          <h2 className="visually-hidden">Продукти</h2>
          <ul className={styles.grid}>
            {shown.map((card, index) => (
              <li key={card.slug}>
                <ProductCard card={card} sizes={SIZES} priority={index < FIRST_ROW_CARDS} />
              </li>
            ))}
          </ul>
          {shown.length < matching.length && (
            <p className={styles.more}>
              <button type="button" className={styles.button} onClick={() => setVisible((n) => n + PAGE_SIZE)}>
                Покажи още
              </button>
            </p>
          )}
        </>
      )}
    </div>
  )
}
