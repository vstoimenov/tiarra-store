'use client'

import { Suspense, useCallback, useMemo, useState, type ChangeEvent, type ReactNode } from 'react'
import { FIRST_ROW_CARDS, ProductCard } from '@/components/product/ProductCard'
import { brandsOf, filterProducts, type SortKey } from '@/lib/catalog/filter'
import type { ProductCard as Card } from '@/lib/catalog/types'
import type { Gender } from '@/lib/catalog/types'
import styles from './ProductGrid.module.css'
import { UrlQuery } from './UrlQuery'
import { isDiscounted } from '@/lib/format'
import { SearchIcon, FilterIcon } from '@/components/layout/icons'

interface Props {
  /** The page's `<h1>`. */
  title: string
  /** Every card of the page; the search, the filters and the sorting run here, in the browser. */
  cards: Card[]
  /** Filter by the `?q=` of the address (the header search sends people to `/store?q=…`). */
  readQuery?: boolean
  /** Shown between the heading and the grid (the category links). */
  children?: ReactNode
  initialGender?: Gender
}

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'female', label: 'За нея' },
  { value: 'male', label: 'За него' },
  { value: 'unisex', label: 'Унисекс' },
]

const PAGE_SIZE = 24
const SIZES = '(min-width: 1100px) 270px, (min-width: 760px) 31vw, 46vw'

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
export function ProductGrid({ title, cards, readQuery = false, children, initialGender }: Props) {
  const [onlyDiscounted, setOnlyDiscounted] = useState(false)
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [text, setText] = useState('')
  const [brand, setBrand] = useState('')
  const [sort, setSort] = useState<SortKey>('newest')
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [gender, setGender] = useState<Gender | undefined>(initialGender)

  const brands = useMemo(() => brandsOf(cards), [cards])
  const genders = useMemo(() => GENDERS.filter(option => cards.some(card => card.gender === option.value)), [cards])
  const hasDiscounts = useMemo(() => cards.some(card => isDiscounted(card.price, card.compareAtPrice)), [cards])
  const matching = useMemo(() => filterProducts(cards, {
    text, brand, sort, gender, onlyDiscounted,
    minPrice: minPrice === '' ? undefined : Number(minPrice),
    maxPrice: maxPrice === '' ? undefined : Number(maxPrice),
  }), [cards, text, brand, sort, gender, onlyDiscounted, minPrice, maxPrice])
  const shown = matching.slice(0, visible)
  const activeCount = [text !== '', brand !== '', Boolean(gender), onlyDiscounted, minPrice !== '' || maxPrice !== ''].filter(Boolean).length
  const filtered = activeCount > 0
  const invalidRange = minPrice !== '' && maxPrice !== '' && Number(minPrice) > Number(maxPrice)

  // A new search or filter starts again from the first 24.
  const onUrlQuery = useCallback((q: string, nextGender: Gender | undefined) => {
    setText(q)
    setGender(nextGender ?? initialGender)
    setVisible(PAGE_SIZE)
  }, [initialGender])

  function onBrand(event: ChangeEvent<HTMLSelectElement>) {
    setBrand(event.target.value)
    setVisible(PAGE_SIZE)
  }

  function onGender(value: string) {
    const next = GENDERS.find(option => option.value === value)?.value
    setGender(next)
    setVisible(PAGE_SIZE)
    const url = new URL(window.location.href)
    if (next) url.searchParams.set('gender', next)
    else url.searchParams.delete('gender')
    if (text) url.searchParams.set('q', text)
    else url.searchParams.delete('q')
    window.history.replaceState(null, '', url.pathname + url.search + url.hash)
  }

  function onSort(event: ChangeEvent<HTMLSelectElement>) {
    if (isSortKey(event.target.value)) setSort(event.target.value)
    setVisible(PAGE_SIZE)
  }

  function clearFilters() {
    // The search lives in the address: drop it there too, or a reload would bring it back.
    const url = new URL(window.location.href)
    url.searchParams.delete('q')
    url.searchParams.delete('gender')
    window.history.replaceState(null, '', url.pathname + url.search + url.hash)
    setText('')
    setBrand('')
    setGender(initialGender)
    setOnlyDiscounted(false)
    setMinPrice('')
    setMaxPrice('')
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
          <span className={styles.eyebrow}>TIARRA CATALOG</span>
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

      <details className={styles.extraFilters}>
        <summary><FilterIcon className={styles.filterIcon} /><span>Филтри</span>{filtered && <span className={styles.filterCount}>{activeCount}</span>}<span className={styles.chevron} aria-hidden="true" /></summary>
        <div className={styles.filterPanel}>
          {genders.length > 1 && <fieldset className={styles.filterGroup}>
            <legend>За кого</legend>
            <div className={styles.genderOptions}>
              {[{ value: '', label: 'Всички' }, ...genders].map(option => <button type="button" key={option.value} aria-pressed={(gender ?? '') === option.value} onClick={() => onGender(option.value)}>{option.label}</button>)}
            </div>
          </fieldset>}
          <fieldset className={styles.filterGroup}>
            <legend>Ценови диапазон</legend>
            <div className={styles.priceRange}>
              <label>От (€)<input type="number" min="0" step="0.01" inputMode="decimal" value={minPrice} onChange={e => {setMinPrice(e.target.value);setVisible(PAGE_SIZE)}} placeholder="0" aria-invalid={invalidRange || undefined} aria-describedby={invalidRange ? 'price-range-error' : undefined} /></label>
              <span aria-hidden="true">—</span>
              <label>До (€)<input type="number" min="0" step="0.01" inputMode="decimal" value={maxPrice} onChange={e => {setMaxPrice(e.target.value);setVisible(PAGE_SIZE)}} placeholder="Без лимит" aria-invalid={invalidRange || undefined} aria-describedby={invalidRange ? 'price-range-error' : undefined} /></label>
            </div>
            {invalidRange && <p id="price-range-error" className={styles.rangeError} role="status">Цената „От“ трябва да е по-ниска или равна на „До“.</p>}
          </fieldset>
          {hasDiscounts && <label className={styles.promotionFilter}><input type="checkbox" checked={onlyDiscounted} onChange={e => {setOnlyDiscounted(e.target.checked);setVisible(PAGE_SIZE)}} /><span>Само промоции<small>Продукти с намалена цена</small></span></label>}
        </div>
      </details>
      {filtered && <p className={styles.activeFilters}>Активни: {[text && `Търсене: ${text}`, brand, GENDERS.find(option => option.value === gender)?.label, onlyDiscounted && 'Промоции', minPrice && `От ${minPrice} €`, maxPrice && `До ${maxPrice} €`].filter(Boolean).join(' · ')} <button type="button" onClick={clearFilters}>Изчисти</button></p>}
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
