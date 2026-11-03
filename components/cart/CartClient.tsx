'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { type CartItem, readCart, writeCart } from '@/lib/cart'
import { formatPrice } from '@/lib/format'
import { imageUrl } from '@/lib/images'
import styles from './CartClient.module.css'

export function CartClient() {
  const [items, setItems] = useState<CartItem[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setItems(readCart())
    setReady(true)
  }, [])

  const total = useMemo(() => items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0), [items])

  function update(next: CartItem[]) {
    setItems(next)
    writeCart(next)
  }

  function changeQuantity(key: string, quantity: number) {
    if (quantity < 1) return
    update(items.map((item) => (item.key === key ? { ...item, quantity: Math.min(quantity, 99) } : item)))
  }

  function remove(key: string) {
    update(items.filter((item) => item.key !== key))
  }

  if (!ready) return <p className={styles.status}>Зареждане на количката…</p>

  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Количката ти е празна.</p>
        <Link href="/store" className={styles.primary}>Разгледай продуктите</Link>
      </div>
    )
  }

  return (
    <div className={styles.layout}>
      <ul className={styles.items} aria-label="Продукти в количката">
        {items.map((item) => (
          <li key={item.key} className={styles.item}>
            <Link href={`/store/${encodeURIComponent(item.slug)}`} className={styles.image}>
              {item.imagePath && <img src={imageUrl(item.imagePath, 400)} alt="" width={120} height={120} />}
            </Link>
            <div className={styles.details}>
              <Link href={`/store/${encodeURIComponent(item.slug)}`} className={styles.title}>{item.title}</Link>
              {item.variantName && <p className={styles.variant}>{item.variantName}</p>}
              <p className={styles.price}>{formatPrice(item.unitPrice)}</p>
              <div className={styles.actions}>
                <label>
                  <span className="visually-hidden">Количество за {item.title}</span>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={item.quantity}
                    onChange={(event) => changeQuantity(item.key, Number.parseInt(event.target.value, 10) || 1)}
                  />
                </label>
                <button type="button" onClick={() => remove(item.key)}>Премахни</button>
              </div>
            </div>
            <strong className={styles.lineTotal}>{formatPrice(item.unitPrice * item.quantity)}</strong>
          </li>
        ))}
      </ul>
      <aside className={styles.summary}>
        <h2>Общо</h2>
        <p><span>Продукти</span><strong>{formatPrice(total)}</strong></p>
        <p className={styles.delivery}>Доставката се изчислява при потвърждение на поръчката.</p>
        <Link href="/store/checkout" className={styles.primary}>Продължи към поръчка</Link>
        <p className={styles.note}>Ще потвърдим наличността и доставката с теб.</p>
      </aside>
    </div>
  )
}
