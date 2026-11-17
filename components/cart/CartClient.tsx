'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { type CartItem, readCart, writeCart } from '@/lib/cart'
import { formatPrice } from '@/lib/format'
import { imageUrl } from '@/lib/images'
import { CartRecommendations } from './CartRecommendations'
import { freeShippingCouriers,type CommerceSettings } from '@/lib/commerce-settings-schema'
import styles from './CartClient.module.css'

export function CartClient({ compact = false, settings }: { compact?: boolean; settings:CommerceSettings }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setItems(readCart())
    setReady(true)
  }, [])

  const total = useMemo(() => items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0), [items])
  const freeShippingRemaining = Math.max(0, Math.round((settings.freeShippingThreshold-total)*100)/100)
  const freeCouriers=freeShippingCouriers(settings)
  const freeLabel=freeCouriers.join(' и ')

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
    <div className={`${styles.layout} ${compact ? styles.compact : ''}`}>
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
                <div className={styles.quantity} role="group" aria-label={`Количество за ${item.title}`}>
                  <button type="button" aria-label={`Намали количеството на ${item.title}`} disabled={item.quantity <= 1} onClick={() => changeQuantity(item.key, item.quantity - 1)}>−</button>
                  <output aria-live="polite">{item.quantity}</output>
                  <button type="button" aria-label={`Увеличи количеството на ${item.title}`} disabled={item.quantity >= 99} onClick={() => changeQuantity(item.key, item.quantity + 1)}>+</button>
                </div>
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
        <p className={styles.delivery}>{freeCouriers.length?(freeShippingRemaining > 0 ? `Добави още ${formatPrice(freeShippingRemaining)} за безплатна доставка с ${freeLabel}.` : `Имаш безплатна доставка с ${freeLabel}.`):'Цената за доставка се изчислява в следващата стъпка.'}</p>
        {freeCouriers.length>0&&<progress className={styles.progress} max={settings.freeShippingThreshold||1} value={settings.freeShippingThreshold===0?1:Math.min(total,settings.freeShippingThreshold)} aria-label="Напредък към безплатна доставка" />}
        <CartRecommendations items={items} onAdded={() => setItems(readCart())} />
        <Link href="/store/checkout" className={styles.primary}>Продължи към поръчка</Link>
        <p className={styles.note}>Ще потвърдим наличността и доставката с теб.</p>
      </aside>
    </div>
  )
}
