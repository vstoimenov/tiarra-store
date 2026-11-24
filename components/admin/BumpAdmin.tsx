'use client'

import { useMemo, useState, useTransition } from 'react'
import type { AdminBumpMapping, AdminProductOption } from '@/lib/admin/bumps'
import { isChogan15MlCase, isChoganPerfume, PRODUCT_BUMP_LABEL } from '@/lib/catalog/bump-rules'
import styles from './BumpAdmin.module.css'

export function BumpAdmin({
  initialProducts,
  initialMappings,
}: {
  initialProducts: AdminProductOption[]
  initialMappings: AdminBumpMapping[]
}) {
  const [productId, setProductId] = useState(initialProducts[0]?.id ?? '')
  const [mappings, setMappings] = useState(initialMappings)
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState('')
  const [pending, startTransition] = useTransition()
  function permittedBump(sourceId: string, targetId: string) {
    const source = initialProducts.find(product => product.id === sourceId)
    const target = initialProducts.find(product => product.id === targetId)
    return source && isChoganPerfume(source) && (!target || !isChogan15MlCase(target)) ? '' : targetId
  }
  const [bumpId, setBumpId] = useState(() => permittedBump(productId, initialMappings.find(entry => entry.productId === productId)?.bumpProductId ?? ''))
  const label = PRODUCT_BUMP_LABEL

  const productMap = useMemo(() => new Map(initialProducts.map((product) => [product.id, product])), [initialProducts])
  const filtered = initialProducts.filter((product) => product.title.toLocaleLowerCase('bg').includes(query.toLocaleLowerCase('bg')))
  const chogan = isChoganPerfume(productMap.get(productId) ?? { title: '' })

  function selectProduct(nextId: string) {
    setProductId(nextId)
    const mapping = mappings.find((entry) => entry.productId === nextId)
    setBumpId(permittedBump(nextId, mapping?.bumpProductId ?? ''))
    setMessage('')
  }

  function save() {
    startTransition(async () => {
      setMessage('')
      try {
        const response = await fetch('/api/admin/bumps', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, bumpProductId: bumpId || null, label }),
        })
        if (!response.ok) {
          setMessage('Промяната не беше записана. Опитай отново.')
          return
        }
        setMappings((previous) => {
          const rest = previous.filter((entry) => entry.productId !== productId)
          return bumpId ? [...rest, { productId, bumpProductId: bumpId, label }] : rest
        })
        setMessage(bumpId ? 'Препоръката е записана.' : 'Включен е автоматичният избор.')
      } catch { setMessage('Няма връзка със сървъра. Опитай отново — изборът ти е запазен тук.') }
    })
  }

  return (
    <section className={styles.panel}>
      <div className={styles.step}>
        <span className={styles.number}>1</span>
        <div>
          <label htmlFor="product-search">Намери основния продукт</label>
          <input disabled={pending} id="product-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Търси по име..." />
          <select disabled={pending} value={productId} onChange={(event) => selectProduct(event.target.value)} size={Math.min(7, Math.max(3, filtered.length))}>
            {filtered.map((product) => <option key={product.id} value={product.id}>{product.title}</option>)}
          </select>
        </div>
      </div>

      <div className={styles.step}>
        <span className={styles.number}>2</span>
        <div>
          <label htmlFor="bump-product">Избери подходящ bump</label>
          <select disabled={pending} id="bump-product" value={bumpId} onChange={(event) => setBumpId(event.target.value)}>
            <option value="">{chogan ? 'Автоматично — OLFazeta кейс 15 мл' : 'Автоматичен релевантен продукт'}</option>
            {initialProducts.filter((product) => product.id !== productId && (!chogan || isChogan15MlCase(product))).map((product) => (
              <option key={product.id} value={product.id}>{product.title}</option>
            ))}
          </select>
          {chogan && <p>За парфюмите CHOGAN се предлага наличен OLFazeta кейс за 15 мл.</p>}
          {bumpId ? <a href={`/store/${productMap.get(bumpId)?.slug}`} target="_blank" rel="noreferrer">Преглед на избрания продукт ↗</a> : null}
        </div>
      </div>

      <div className={styles.step}>
        <span className={styles.number}>3</span>
        <div>
          <label htmlFor="bump-label">Текст над предложението</label>
          <input readOnly id="bump-label" value={label} />
        </div>
      </div>

      <div className={styles.actions}>
        <button type="button" onClick={save} disabled={pending || !productId}>{pending ? 'Записване…' : 'Запази bump-а'}</button>
        <p role="status">{message}</p>
      </div>
    </section>
  )
}

