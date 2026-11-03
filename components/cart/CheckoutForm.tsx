'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { type CartItem, readCart, writeCart } from '@/lib/cart'
import { formatPrice } from '@/lib/format'
import styles from './CheckoutForm.module.css'

export function CheckoutForm() {
  const [items, setItems] = useState<CartItem[]>([])
  const [ready, setReady] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0), [items])

  useEffect(() => { setItems(readCart()); setReady(true) }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    const data = new FormData(event.currentTarget)
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          customerName: data.get('customerName'), phone: data.get('phone'), email: data.get('email'),
          courier: data.get('courier'), deliveryAddress: data.get('deliveryAddress'), notes: data.get('notes'),
          items: items.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity })),
        }),
      })
      const result = await response.json() as { error?: string; orderNumber?: string }
      if (!response.ok || !result.orderNumber) throw new Error(result.error || 'Поръчката не беше записана.')
      writeCart([])
      setItems([])
      setOrderNumber(result.orderNumber)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Поръчката не беше записана.')
    } finally { setPending(false) }
  }

  if (!ready) return <p>Зареждане…</p>
  if (orderNumber) return <div className={styles.success}><h2>Благодарим ти!</h2><p>Поръчка №{orderNumber} е приета. Ще се свържем с теб за потвърждение.</p><Link href="/store">Обратно към магазина</Link></div>
  if (items.length === 0) return <div className={styles.success}><p>Количката ти е празна.</p><Link href="/store">Разгледай продуктите</Link></div>

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.fields}>
        <label>Име и фамилия<input name="customerName" autoComplete="name" required minLength={2} /></label>
        <label>Телефон<input name="phone" type="tel" autoComplete="tel" required minLength={7} /></label>
        <label>Имейл <span>(по желание)</span><input name="email" type="email" autoComplete="email" /></label>
        <fieldset><legend>Куриер</legend><label><input type="radio" name="courier" value="econt" defaultChecked /> Еконт</label><label><input type="radio" name="courier" value="speedy" /> Спиди</label></fieldset>
        <label>Адрес или офис на куриера<textarea name="deliveryAddress" required minLength={5} rows={3} /></label>
        <label>Бележка <span>(по желание)</span><textarea name="notes" rows={3} /></label>
        <label className={styles.consent}><input type="checkbox" required /> Съгласен/на съм данните ми да бъдат използвани за изпълнение на поръчката.</label>
      </div>
      <aside className={styles.summary}><h2>Твоята поръчка</h2>{items.map(item=><p key={item.key}><span>{item.title} × {item.quantity}</span><strong>{formatPrice(item.unitPrice*item.quantity)}</strong></p>)}<p className={styles.total}><span>Продукти</span><strong>{formatPrice(subtotal)}</strong></p><small>Безплатна доставка над 39 €. Под тази сума доставката се добавя според куриера.</small>{error&&<p role="alert" className={styles.error}>{error}</p>}<button type="submit" disabled={pending}>{pending?'Изпращане…':'Потвърди поръчката'}</button></aside>
    </form>
  )
}
